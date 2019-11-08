import { ensureDb, sleep } from '../util/common.mjs';
import DownloadQueue from '../util/DownloadQueue.mjs';
import { downloadCdnFile } from '../util/cdn.mjs';
import { downloadImageFile } from '../util/image.mjs';
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

  const buildRepositoryQueue = new DownloadQueue('https://cdn.gog.com', env.GROG_DATA_DIR, downloadCdnFile);

  for (const path of await db.product.getApiProductBuildRepositoryPaths({ productId })) {
    if (path.includes('content-system/v2/meta')) {
      const md5 = path.split('/').slice(-1)[0];
      buildRepositoryQueue.add({ productId, path, md5 });
    } else {
      buildRepositoryQueue.add({ productId, path });
    }
  }

  await buildRepositoryQueue.run();

  const imageQueue = new DownloadQueue('https://images.gog.com', env.GROG_DATA_DIR, downloadImageFile);

  for (const rawUrl of Object.values(productData.images)) {
    const url = rawUrl.startsWith('http')
      ? new URL(rawUrl)
      : new URL(`https:${rawUrl}`);

    const rawPath = url.pathname;
    const path = `${rawPath.split('.')[0].split('_')[0]}.png`;
    imageQueue.add({ productId, path });
  }

  for (const screenshot of productData.screenshots) {
    if (screenshot['image_id']) {
      const path = `/${screenshot['image_id']}.png`;
      imageQueue.add({ productId, path });
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
