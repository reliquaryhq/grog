import { ensureDb, sleep } from '../util/common.mjs';
import { mirrorProduct } from '../util/mirror.mjs';
import * as api from '../api.mjs';

const handleMirrorProduct = async (_args, flags) => {
  if (flags['all']) {
    const { totalPages } = await api.product.getCatalogProducts(1, 'release_desc');

    for (let page = 1; page <= totalPages; page++) {
      console.log(`Mirroring catalog products from page ${page} of ${totalPages}...`);

      const { products = [] } = await api.product.getCatalogProducts(page, 'release_desc');

      for (const product of products) {
        await mirrorProduct(product.id);
        await sleep(1000);
      }
    }
  } else {
    const productId = flags['product-id'];
    await mirrorProduct(productId);
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
