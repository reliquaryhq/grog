import path from 'path';
import zlib from 'zlib';
import { sleep } from './common.mjs';
import DownloadQueue from './DownloadQueue.mjs';
import { GOG_CDN_URL, GOG_IMAGES_URL } from './api.mjs';
import { downloadAsset, readAsset } from './asset.mjs';
import { env } from './process.mjs';
import { createOrUpdateApiProduct, createOrUpdateApiProductBuilds } from './product.mjs';
import { formatPath22 } from './string.mjs';
import * as api from '../api.mjs';
import * as db from '../db.mjs';

const mirrorDepotManifests = async (repositoryPaths) => {
  const depotManifestQueue = new DownloadQueue(env.GROG_DATA_DIR, downloadAsset, 500);

  for (const repositoryPath of repositoryPaths) {
    const repositoryUrl = `${GOG_CDN_URL}${repositoryPath}`;
    const repositoryData = await readAsset({ url: repositoryUrl }, env.GROG_DATA_DIR);

    if (repositoryPath.startsWith('/content-system/v1')) {
      const repository = JSON.parse(repositoryData.toString('utf8'));
      const { product: { depots = [], rootGameID } = {} } = repository;
      const productId = rootGameID ? parseInt(rootGameID, 10) : null;

      for (const depot of depots) {
        if (!depot.manifest) {
          continue;
        }

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

  await depotManifestQueue.run();
};

const mirrorProduct = async (productId) => {
  const productData = await api.product.getProduct(productId);
  const productFetchedAt = new Date();

  console.log(`\nMirroring product; product: ${productId}; title: ${productData['title']}`);

  await createOrUpdateApiProduct(productId, productData, productFetchedAt);

  const oss = Object.keys(productData['content_system_compatibility'])
    .filter((os) => productData['content_system_compatibility'][os]);

  for (const os of oss) {
    await sleep(500);

    const buildsData = await api.cs.getBuilds(productId, os);
    const buildsFetchedAt = new Date();

    await createOrUpdateApiProductBuilds(productId, os, buildsData, buildsFetchedAt);
  }

  const buildRepositoryQueue = new DownloadQueue(env.GROG_DATA_DIR, downloadAsset, 500);
  const buildRepositoryPaths = await db.product.getApiProductBuildRepositoryPaths({ productId });

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

  await buildRepositoryQueue.run();

  await mirrorDepotManifests(buildRepositoryPaths);

  const imageQueue = new DownloadQueue(env.GROG_DATA_DIR, downloadAsset, 500);

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

  await imageQueue.run();
};

export {
  mirrorProduct,
};
