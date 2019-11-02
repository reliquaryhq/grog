import { ensureDb, sleep } from '../util/common.mjs';
import * as api from '../api.mjs';
import * as db from '../db.mjs';

const handleMirrorProduct = async (_args, flags) => {
  const productId = flags['product-id'];

  const productData = await api.product.getProduct(productId);
  const productFetchedAt = new Date();

  await db.product.createOrUpdateApiProduct(productId, productData, productFetchedAt);

  const oss = Object.keys(productData['content_system_compatibility'])
    .filter((os) => productData['content_system_compatibility'][os]);

  for (const os of oss) {
    await sleep(2000);

    const buildsData = await api.cs.getBuilds(productId, os);
    const buildsFetchedAt = new Date();

    // TODO
    // store builds
  }
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
