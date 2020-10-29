import path from 'path';
import zlib from 'zlib';
import { sleep } from './common.mjs';
import DownloadQueue from './DownloadQueue.mjs';
import SecureLinkV1 from '../core/SecureLinkV1.mjs';
import SecureLinkV2 from '../core/SecureLinkV2.mjs';
import { GOG_CDN_URL, GOG_IMAGES_URL } from './api.mjs';
import { downloadAsset, readAsset } from './asset.mjs';
import {
  createBuildsFromApiProductBuilds,
  syncBuildRepositoryGen1,
  syncBuildRepositoryGen2,
} from './build.mjs';
import { env } from './process.mjs';
import { createOrUpdateApiProduct, createOrUpdateApiProductBuilds } from './product.mjs';
import { loadSession, saveSession } from './session.mjs';
import { formatPath22 } from './string.mjs';
import * as api from '../api.mjs';
import * as db from '../db.mjs';
import { shutdown } from './process.mjs';
import { createProductFromApiProduct } from './product.mjs';

const mirrorGen1Depot = async (manifestPath, productId, build) => {
  if (shutdown.shuttingDown) {
    return;
  }

  const manifestId = manifestPath.split('/').slice(-1)[0].split('.json')[0];
  const manifestUrl = `${GOG_CDN_URL}${manifestPath}`;
  const manifestData = await readAsset({ url: manifestUrl }, env.GROG_DATA_DIR);
  const manifest = JSON.parse(manifestData);

  if (manifest.version !== 1) {
    throw new Error(`Unsupported depot manifest version: ${manifest.version}`);
  }

  const depotQueue = new DownloadQueue(env.GROG_DATA_DIR, downloadAsset, 0);

  const session = await loadSession();

  if (!session) {
    throw new Error('Session expired');
  }

  const link = new SecureLinkV1(productId);
  await link.authenticate(session);

  await saveSession(session);

  // Consider all depot URLs to be hosted on the conventional GOG_CDN_URL hostname
  const hostname = new URL(GOG_CDN_URL).hostname;

  for (const file of manifest.depot.files) {
    if (!file.url) {
      continue;
    }

    const name = file.url.split('/').slice(1).join('/');
    const path = `${build.os}/${build.gog_legacy_id}/${name}`;

    const entry = {
      type: 'depot-file',
      productId,
      url: link.getUrl(path),
      hostname,
    };

    depotQueue.add(entry);
  }

  if (depotQueue.length > 0) {
    console.log(`Syncing gen 1 depot for owned product; product id: ${productId}; depot manifest: ${manifestId}; depot files: ${manifest.depot.files.length}`);
    await depotQueue.run();
  }
};

const mirrorGen2Depot = async (manifestPath, productId) => {
  if (shutdown.shuttingDown) {
    return;
  }

  const manifestUrl = `${GOG_CDN_URL}${manifestPath}`;
  const manifestData = await readAsset({ url: manifestUrl }, env.GROG_DATA_DIR);
  const manifest = JSON.parse(zlib.inflateSync(manifestData));

  if (manifest.version !== 2) {
    throw new Error(`Unsupported depot manifest version: ${manifest.version}`);
  }

  const mirroredChunkMd5s = await db.asset.getChunkMd5sByProductId({ productId });

  const manifestId = manifestPath.split('/').slice(-1)[0];

  const depotQueue = new DownloadQueue(env.GROG_DATA_DIR, downloadAsset, 0);

  const session = await loadSession();

  if (!session) {
    throw new Error('Session expired');
  }

  const link = new SecureLinkV2(productId);
  await link.authenticate(session);

  await saveSession(session);

  // Consider all depot URLs to be hosted on the conventional GOG_CDN_URL hostname
  const hostname = new URL(GOG_CDN_URL).hostname;

  const addChunk = (chunk) => {
    if (mirroredChunkMd5s[chunk.compressedMd5]) {
      return;
    }

    const path = formatPath22(chunk.compressedMd5);

    const entry = {
      type: 'depot-file-chunk',
      productId,
      url: link.getUrl(path),
      hostname,
      size: chunk.compressedSize,
      hash: {
        algorithm: 'md5',
        encoding: 'hex',
        value: chunk.compressedMd5,
      },
    };

    depotQueue.add(entry);
  };

  for (const item of manifest.depot.items) {
    if (item.type !== 'DepotFile') {
      continue;
    }

    for (const chunk of item.chunks) {
      addChunk(chunk);
    }
  }

  if (manifest.depot.smallFilesContainer) {
    for (const chunk of manifest.depot.smallFilesContainer.chunks) {
      addChunk(chunk);
    }
  }

  if (depotQueue.length > 0) {
    console.log(`Syncing gen 2 depot for owned product; product id: ${productId}; depot manifest: ${manifestId}; depot items: ${manifest.depot.items.length}`);
    await depotQueue.run();
  }
};

const mirrorGen2OfflineDepot = async (manifestPath, productId) => {
  if (shutdown.shuttingDown) {
    return;
  }

  const manifestUrl = `${GOG_CDN_URL}${manifestPath}`;
  const manifestData = await readAsset({ url: manifestUrl }, env.GROG_DATA_DIR);
  const manifest = JSON.parse(zlib.inflateSync(manifestData));

  if (manifest.version !== 2) {
    throw new Error(`Unsupported depot manifest version: ${manifest.version}`);
  }

  const mirroredChunkMd5s = await db.asset.getOfflineChunkMd5s();

  const manifestId = manifestPath.split('/').slice(-1)[0];

  const depotQueue = new DownloadQueue(env.GROG_DATA_DIR, downloadAsset, 10);

  const addChunk = (chunk) => {
    if (mirroredChunkMd5s[chunk.compressedMd5]) {
      return;
    }

    const path = formatPath22(chunk.compressedMd5);
    const url = `${GOG_CDN_URL}/content-system/v2/offline/${path}`;

    const entry = {
      type: 'depot-file-chunk',
      productId,
      url,
      size: chunk.compressedSize,
      hash: {
        algorithm: 'md5',
        encoding: 'hex',
        value: chunk.compressedMd5,
      },
    };

    depotQueue.add(entry);
  };

  for (const item of manifest.depot.items) {
    if (item.type !== 'DepotFile') {
      continue;
    }

    for (const chunk of item.chunks) {
      addChunk(chunk);
    }
  }

  if (manifest.depot.smallFilesContainer) {
    for (const chunk of manifest.depot.smallFilesContainer.chunks) {
      addChunk(chunk);
    }
  }

  if (depotQueue.length > 0) {
    console.log(`Syncing gen 2 offline depot for owned product; depot manifest: ${manifestId}; depot items: ${manifest.depot.items.length}`);
    await depotQueue.run();
  }
};

const mirrorDepots = async (repositoryPaths, ownedProductIds) => {
  for (const repositoryPath of repositoryPaths) {
    if (shutdown.shuttingDown) {
      return;
    }

    const repositoryUrl = `${GOG_CDN_URL}${repositoryPath}`;
    const repositoryData = await readAsset({ url: repositoryUrl }, env.GROG_DATA_DIR);

    if (repositoryPath.startsWith('/content-system/v1')) {
      const repository = JSON.parse(repositoryData.toString('utf8'));
      const { product: { depots = [], rootGameID } = {} } = repository;
      const rootGameId = rootGameID ? parseInt(rootGameID, 10) : null;

      const buildProductGogId = repository.product.rootGameID;
      const buildGogLegacyId = repositoryPath.split('/')[6];

      const buildProduct = await db.product.getProduct({
        gogId: buildProductGogId,
      });

      if (!buildProduct) {
        throw new Error(`Missing product: ${buildProductGogId}`);
      }

      const build = await db.build.getBuild({
        productId: buildProduct.id,
        gogLegacyId: buildGogLegacyId,
      });

      if (!build) {
        throw new Error(`Missing build: ${buildGogLegacyId}`);
      }

      for (const depot of depots) {
        if (!depot.manifest) {
          continue;
        }

        const gameIds = depot.gameIDs.map((id) => parseInt(id, 10));
        const productId = gameIds[0] || rootGameId;
        const isOwned = ownedProductIds.includes(productId);

        if (!isOwned) {
          console.log(`Skipping gen 1 depot for unowned product; product: ${productId}`);
          continue;
        }

        const manifestPath = path.resolve(repositoryPath, '../', depot.manifest);

        await mirrorGen1Depot(manifestPath, productId, build);
      }
    } else if (repositoryPath.startsWith('/content-system/v2')) {
      const repository = JSON.parse(zlib.inflateSync(repositoryData));
      const { depots = [], offlineDepot } = repository;

      for (const depot of depots) {
        if (!depot.manifest) {
          continue;
        }

        const manifestPath = `/content-system/v2/meta/${formatPath22(depot.manifest)}`;
        const productId = parseInt(depot.productId, 10);
        const isOwned = ownedProductIds.includes(productId);

        if (!isOwned) {
          console.log(`Skipping gen 2 depot for unowned product; product: ${productId}`);
          continue;
        }

        await mirrorGen2Depot(manifestPath, productId);
      }

      if (offlineDepot && offlineDepot.manifest) {
        const manifestPath = `/content-system/v2/meta/${formatPath22(offlineDepot.manifest)}`;
        const productId = parseInt(offlineDepot.productId, 10);

        await mirrorGen2OfflineDepot(manifestPath, productId);
      }
    }
  }
};

const mirrorDepotManifests = async (repositoryPaths) => {
  if (shutdown.shuttingDown) {
    return;
  }

  const depotManifestQueue = new DownloadQueue(env.GROG_DATA_DIR, downloadAsset, 0);

  for (const repositoryPath of repositoryPaths) {
    const repositoryUrl = `${GOG_CDN_URL}${repositoryPath}`;
    const repositoryData = await readAsset({ url: repositoryUrl }, env.GROG_DATA_DIR);

    if (repositoryPath.startsWith('/content-system/v1')) {
      const repository = JSON.parse(repositoryData.toString('utf8'));

      await syncBuildRepositoryGen1(repository, repositoryPath);

      const { product: { depots = [], rootGameID } = {} } = repository;
      const rootGameId = rootGameID ? parseInt(rootGameID, 10) : null;

      for (const depot of depots) {
        if (!depot.manifest) {
          continue;
        }

        const gameIds = depot.gameIDs.map((id) => parseInt(id, 10));
        const productId = gameIds[0] || rootGameId;

        const manifestPath = path.resolve(repositoryPath, '../', depot.manifest);

        const entry = {
          type: 'depot-manifest',
          productId,
          url: `${GOG_CDN_URL}${manifestPath}`,
        };

        depotManifestQueue.add(entry);
      }
    } else if (repositoryPath.startsWith('/content-system/v2')) {
      const repository = JSON.parse(zlib.inflateSync(repositoryData));

      await syncBuildRepositoryGen2(repository, repositoryPath);

      const { depots = [], offlineDepot } = repository;

      for (const depot of depots) {
        if (!depot.manifest) {
          continue;
        }

        const manifestPath = `/content-system/v2/meta/${formatPath22(depot.manifest)}`;

        const entry = {
          type: 'depot-manifest',
          productId: parseInt(depot.productId, 10),
          url: `${GOG_CDN_URL}${manifestPath}`,
          hash: {
            algorithm: 'md5',
            encoding: 'hex',
            value: depot.manifest,
          },
        };

        depotManifestQueue.add(entry);
      }

      if (offlineDepot && offlineDepot.manifest) {
        const manifestPath = `/content-system/v2/meta/${formatPath22(offlineDepot.manifest)}`;

        const entry = {
          type: 'depot-manifest',
          productId: parseInt(offlineDepot.productId, 10),
          url: `${GOG_CDN_URL}${manifestPath}`,
          hash: {
            algorithm: 'md5',
            encoding: 'hex',
            value: offlineDepot.manifest,
          },
        };

        depotManifestQueue.add(entry);
      }
    } else {
      throw new Error(`Unknown build repository generation: ${repositoryPath}`);
    }
  }

  if (depotManifestQueue.length > 0) {
    console.log('Syncing depot manifests');
    await depotManifestQueue.run();
  }
};

const mirrorDownloads = async (productId, productData) => {
  if (shutdown.shuttingDown) {
    return;
  }

  const downloadQueue = new DownloadQueue(env.GROG_DATA_DIR, downloadAsset, 0);

  const productDownloads = productData['downloads'] || {};
  const bonuses = productDownloads['bonus_content'] || [];
  const languagePacks = productDownloads['language_packs'] || [];

  const addFile = async (file, assetType) => {
    if (shutdown.shuttingDown) {
      return;
    }

    if (file['size'] === 0) {
      return;
    }

    const downlinkPath = new URL(file['downlink']).pathname;
    const downlink = await db.downlink.getDownlink({ productId, downlinkPath });
    const asset = downlink ? await db.asset.getAssetById({ id: downlink['asset_id'] }) : null;

    if (downlink && asset) {
      const url = `https://${asset.host}${asset.path}`;

      const entry = {
        type: assetType,
        productId,
        url,
      };

      downloadQueue.add(entry);
    } else {
      const session = await loadSession();

      if (!session) {
        throw new Error('Session expired');
      }

      const authorization = await session.getBearer();

      let downlinkData;

      try {
        downlinkData = await api.product.getDownlink(downlinkPath, authorization);
      } catch (error) {
        console.error(`Error when requesting downlink from API: ${error}`);
        return;
      }

      await saveSession(session);

      if (!downlinkData['downlink']) {
        return;
      }

      const downlinkDataUrl = new URL(downlinkData['downlink']);
      const isRedirect = downlinkDataUrl.hostname === 'content-system.gog.com'
        && downlinkDataUrl.pathname.endsWith('/website/download');
      const isFinal = downlinkDataUrl.hostname !== 'content-system.gog.com'
        && downlinkDataUrl.pathname !== '/secure';

      let finalDownlinkUrl;

      if (isFinal) {
        finalDownlinkUrl = downlinkDataUrl.href;
      } else if (isRedirect) {
        try {
          finalDownlinkUrl = await api.cs.resolveRedirect(downlinkDataUrl.href);

          // Bad response
          if (/^https:\/\/cdn-hw\.gog\.com\/securea{0,}\?/.test(finalDownlinkUrl)) {
            finalDownlinkUrl = null;
          }
        } catch (error) {
          console.error(`Error when resolving downlink redirect: ${error}`);
          return;
        }

        await sleep(1000);
      }

      if (finalDownlinkUrl) {
        const onDownloaded = async ({ asset }) => {
          const existingDownlink = await db.downlink.getDownlink({ productId, downlinkPath });

          if (!existingDownlink) {
            await db.downlink.createDownlink({
              productId,
              fileId: file['id'],
              assetId: asset['id'],
              downlinkPath,
            });
          }
        };

        const entry = {
          type: assetType,
          productId,
          url: finalDownlinkUrl,
          onDownloaded,
        };

        downloadQueue.add(entry);
      }
    }
  };

  for (const bonus of bonuses) {
    for (const file of bonus['files'] || []) {
      await addFile(file, 'bonus-content-file');
    }
  }

  for (const languagePack of languagePacks) {
    for (const file of languagePack['files'] || []) {
      await addFile(file, 'language-pack-file');
    }
  }

  if (downloadQueue.length > 0) {
    console.log('Syncing downloads');
    await downloadQueue.run();
  }
};

const mirrorProductImages = async (productId, productData) => {
  const imageQueue = new DownloadQueue(env.GROG_DATA_DIR, downloadAsset, 0);

  for (const rawUrl of Object.values(productData.images)) {
    if (!rawUrl) {
      continue;
    }

    const url = rawUrl.startsWith('http')
      ? new URL(rawUrl)
      : new URL(`https:${rawUrl}`);

    imageQueue.add({
      url: `${GOG_IMAGES_URL}${url.pathname.split('.')[0].split('_')[0]}.png`,
      productId,
      type: 'product-image',
    });
  }

  for (const screenshot of productData.screenshots) {
    if (screenshot['image_id']) {
      const url = `${GOG_IMAGES_URL}/${screenshot['image_id']}.png`;

      imageQueue.add({
        url,
        productId,
        type: 'screenshot',
      });
    }
  }

  if (imageQueue.length > 0) {
    console.log('Syncing product images');
    await imageQueue.run();
  }
};

const mirrorRepositoryManifests = async (productId, buildRepositoryPaths) => {
  const buildRepositoryQueue = new DownloadQueue(env.GROG_DATA_DIR, downloadAsset, 0);

  for (const path of buildRepositoryPaths) {
    const url = `${GOG_CDN_URL}${path}`;

    const entry = {
      url,
      productId,
      type: 'repository-manifest',
    };

    if (path.includes('content-system/v2/meta')) {
      const md5 = path.split('/').slice(-1)[0];

      entry.hash = {
        algorithm: 'md5',
        encoding: 'hex',
        value: md5,
      };
    }

    buildRepositoryQueue.add(entry);
  }

  if (buildRepositoryQueue.length > 0) {
    console.log('Syncing repository manifests');
    await buildRepositoryQueue.run();
  }
};

const mirrorProduct = async (productId, ownedProductIds, includeDepots = false) => {
  const productData = await api.product.getProduct(productId);
  const productFetchedAt = new Date();

  console.log(`\nMirroring product; product: ${productId}; title: ${productData['title']}; owned: ${ownedProductIds.includes(productId)}`);

  const apiProduct = await createOrUpdateApiProduct(productId, productData, productFetchedAt);
  const productRecord = await createProductFromApiProduct(apiProduct);

  const oss = Object.keys(productData['content_system_compatibility'])
    .filter((os) => productData['content_system_compatibility'][os]);

  for (const os of oss) {
    await sleep(500);

    let buildsData;

    try {
      buildsData = await api.cs.getBuilds(productId, os);
    } catch (error) {
      const { response } = error;
      const details = response ? response.error_description || response.error : '';

      console.error(`Failed to load build data for ${os}: ${details}`);

      continue;
    }

    if (buildsData) {
      const buildsFetchedAt = new Date();
      const apiProductBuilds = await createOrUpdateApiProductBuilds(productId, os, buildsData, buildsFetchedAt);
      await createBuildsFromApiProductBuilds(productRecord, apiProductBuilds);
    }
  }

  const productBuilds = await db.build.getBuilds({ productId: productRecord.id });
  const buildRepositoryPaths = productBuilds.map((build) => build.repository_path);

  await mirrorRepositoryManifests(productId, buildRepositoryPaths);

  await mirrorDepotManifests(buildRepositoryPaths);

  await mirrorProductImages(productId, productData);

  if (ownedProductIds.includes(productId)) {
    await mirrorDownloads(productId, productData);

    if (includeDepots) {
      await mirrorDepots(buildRepositoryPaths, ownedProductIds);
    }
  }
};

export {
  mirrorProduct,
};
