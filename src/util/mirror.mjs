import { sleep } from './common.mjs';
import DownloadQueue from './DownloadQueue.mjs';
import { GOG_CDN_URL, GOG_IMAGES_URL } from './api.mjs';
import { downloadAsset } from './asset.mjs';
import { env } from './process.mjs';
import { createOrUpdateApiProduct, createOrUpdateApiProductBuilds } from './product.mjs';
import * as api from '../api.mjs';
import * as db from '../db.mjs';

const mirrorProduct = async (productId) => {
  console.log(`Mirroring product; product: ${productId}`);

  const productData = await api.product.getProduct(productId);
  const productFetchedAt = new Date();

  await createOrUpdateApiProduct(productId, productData, productFetchedAt);

  const oss = Object.keys(productData['content_system_compatibility'])
    .filter((os) => productData['content_system_compatibility'][os]);

  for (const os of oss) {
    await sleep(1000);

    const buildsData = await api.cs.getBuilds(productId, os);
    const buildsFetchedAt = new Date();

    await createOrUpdateApiProductBuilds(productId, os, buildsData, buildsFetchedAt);
  }

  const buildRepositoryQueue = new DownloadQueue(env.GROG_DATA_DIR, downloadAsset);

  for (const path of await db.product.getApiProductBuildRepositoryPaths({ productId })) {
    const url = `${GOG_CDN_URL}${path}`;

    const entry = {
      url,
      productId,
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

  const imageQueue = new DownloadQueue(env.GROG_DATA_DIR, downloadAsset);

  for (const rawUrl of Object.values(productData.images)) {
    const url = rawUrl.startsWith('http')
      ? new URL(rawUrl)
      : new URL(`https:${rawUrl}`);

    imageQueue.add({
      url: `${GOG_IMAGES_URL}${url.pathname.split('.')[0].split('_')[0]}.png`,
      productId,
    });
  }

  for (const screenshot of productData.screenshots) {
    if (screenshot['image_id']) {
      const url = `${GOG_IMAGES_URL}/${screenshot['image_id']}.png`;

      imageQueue.add({
        url,
        productId,
      });
    }
  }

  await imageQueue.run();
};

export {
  mirrorProduct,
};
