import path from 'path';
import zlib from 'zlib';
import { sleep } from './common.mjs';
import DownloadQueue from './DownloadQueue.mjs';
import SecureLinkV2 from '../core/SecureLinkV2.mjs';
import { GOG_CDN_URL, GOG_IMAGES_URL } from './api.mjs';
import { downloadAsset, readAsset } from './asset.mjs';
import { createBuildsFromApiProductBuilds, syncBuildRepositoryGen2 } from './build.mjs';
import { env } from './process.mjs';
import { createOrUpdateApiProduct, createOrUpdateApiProductBuilds } from './product.mjs';
import { loadSession, saveSession } from './session.mjs';
import { formatPath22 } from './string.mjs';
import * as api from '../api.mjs';
import * as db from '../db.mjs';
import { shutdown } from './process.mjs';
import { createProductFromApiProduct } from './product.mjs';

const mirrorV1Depot = async (manifestPath, _productId) => {
  if (shutdown.shuttingDown) {
    return;
  }

  const manifestUrl = `${GOG_CDN_URL}${manifestPath}`;
  const manifestData = await readAsset({ url: manifestUrl }, env.GROG_DATA_DIR);
  const manifest = JSON.parse(manifestData);

  console.log(manifest);

  throw 'Unimplemented';
};

const mirrorV2Depot = async (manifestPath, productId) => {
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
    console.log(`Syncing V2 depot for owned product; product id: ${productId}; depot manifest: ${manifestId}; depot items: ${manifest.depot.items.length}`);
    await depotQueue.run();
  }
};

const mirrorV2OfflineDepot = async (manifestPath, productId) => {
  if (shutdown.shuttingDown) {
    return;
  }

  const manifestUrl = `${GOG_CDN_URL}${manifestPath}`;
  const manifestData = await readAsset({ url: manifestUrl }, env.GROG_DATA_DIR);
  const manifest = JSON.parse(zlib.inflateSync(manifestData));

  if (manifest.version !== 2) {
    throw new Error(`Unsupported depot manifest version: ${manifest.version}`);
  }

  const manifestId = manifestPath.split('/').slice(-1)[0];
  console.log(`Syncing V2 offline depot for owned product; depot manifest: ${manifestId}; depot items: ${manifest.depot.items.length}`);

  const depotQueue = new DownloadQueue(env.GROG_DATA_DIR, downloadAsset, 10);

  const addChunk = (chunk) => {
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

  await depotQueue.run();
};

const mirrorDepots = async (repositoryPaths, ownedProductIds) => {
  for (const repositoryPath of repositoryPaths) {
    if (shutdown.shuttingDown) {
      return;
    }

    const repositoryUrl = `${GOG_CDN_URL}${repositoryPath}`;
    const repositoryData = await readAsset({ url: repositoryUrl }, env.GROG_DATA_DIR);

    if (repositoryPath.startsWith('/content-system/v1')) {
      const repository = repositoryData.toString('utf8');
      const { product: { depots = [], rootGameID } = {} } = repository;
      const rootGameId = rootGameID ? parseInt(rootGameID, 10) : null;

      for (const depot of depots) {
        if (!depot.manifest) {
          continue;
        }

        const gameIds = depot.gameIDs.map((id) => parseInt(id, 10));
        const productId = gameIds[0] || rootGameId;
        const isOwned = ownedProductIds.includes(productId);

        if (!isOwned) {
          console.log(`Skipping V1 depot for unowned product; product: ${productId}`);
          continue;
        }

        const manifestPath = path.resolve(repositoryPath, '../', depot.manifest);

        await mirrorV1Depot(manifestPath, productId);
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
          console.log(`Skipping V2 depot for unowned product; product: ${productId}`);
          continue;
        }

        await mirrorV2Depot(manifestPath, productId);
      }

      if (offlineDepot && offlineDepot.manifest) {
        const manifestPath = `/content-system/v2/meta/${formatPath22(offlineDepot.manifest)}`;
        const productId = parseInt(offlineDepot.productId, 10);

        await mirrorV2OfflineDepot(manifestPath, productId);
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
      const { depots = [], offlineDepot } = repository;

      await syncBuildRepositoryGen2(repository);

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

      const validDownlink = downlinkData['downlink']
        && new URL(downlinkData['downlink']).pathname !== '/secure'
        && new URL(downlinkData['downlink']).hostname !== 'content-system.gog.com';

      if (validDownlink) {
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
          url: downlinkData['downlink'],
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
