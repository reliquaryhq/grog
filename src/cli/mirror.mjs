import { ensureDb, sleep } from '../util/common.mjs';
import DownloadQueue from '../util/DownloadQueue.mjs';
import { downloadAsset } from '../util/asset.mjs';
import { env } from '../util/process.mjs';
import { createOrUpdateApiProduct, createOrUpdateApiProductBuilds } from '../util/product.mjs';
import * as api from '../api.mjs';
import * as db from '../db.mjs';

const handleMirrorProduct = async (_args, flags) => {
  const productId = flags['product-id'];

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
    const url = `https://cdn.gog.com${path}`;

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
      url: `https://images.gog.com${url.pathname.split('.')[0].split('_')[0]}.png`,
      productId,
    });
  }

  for (const screenshot of productData.screenshots) {
    if (screenshot['image_id']) {
      const url = `https://images.gog.com/${screenshot['image_id']}.png`;

      imageQueue.add({
        url,
        productId,
      });
    }
  }

  await imageQueue.run();
};

const handleMirror = async ([command, ...args], flags) => {
  await ensureDb();

  switch (command) {
    case 'product': {
      return handleMirrorProduct(args, flags);
    }

    default: {
      throw new Error(`Unsupported command: ${command}`);
    }
  }
};

export {
  handleMirror,
};
