import { ensureDb, sleep } from '../util/common.mjs';
import DownloadQueue from '../util/DownloadQueue.mjs';
import { downloadCdnFile } from '../util/cdn.mjs';
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

  const queue = new DownloadQueue('https://cdn.gog.com', env.GROG_DATA_DIR, downloadCdnFile);

  for (const path of await db.product.getApiProductBuildRepositoryPaths({ productId })) {
    if (path.includes('content-system/v2/meta')) {
      const md5 = path.split('/').slice(-1)[0];
      queue.add({ productId, path, md5 });
    } else {
      queue.add({ productId, path });
    }
  }

  await queue.run();
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
