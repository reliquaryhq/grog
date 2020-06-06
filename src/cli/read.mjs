import { ensureDb } from '../util/common.mjs';
import { getProductBuilds } from '../util/product.mjs';
import * as db from '../db.mjs';

const handleReadProduct = async (_args, flags) => {
  const productId = flags['product-id'];

  const product = await db.product.getApiProduct({ productId });

  if (!product) {
    console.log('Product not found');
    return;
  }

  if (flags['only-data']) {
    console.log(JSON.stringify(product['data'], null, 2));
    return;
  }

  console.log(JSON.stringify({
    'id': product['product_id'],
    'revision': product['revision'],
    'revision_first_seen_at': new Date(product['revision_first_seen_at']).toISOString(),
    'revision_last_seen_at': new Date(product['revision_first_seen_at']).toISOString(),
  }, null, 2));
};

const handleReadProductBuilds = async (_args, flags) => {
  const productId = flags['product-id'];
  const os = flags['os'];

  const productBuilds = await getProductBuilds(productId, os);

  if (flags['as-json']) {
    console.log(JSON.stringify(Object.values(productBuilds), null, 2));
    return;
  }

  console.log(Object.values(productBuilds));
};

const handleRead = async ([command, ...args], flags) => {
  await ensureDb();

  switch (command) {
    case 'product': {
      return handleReadProduct(args, flags);
    }

    case 'product-builds': {
      return handleReadProductBuilds(args, flags);
    }

    default: {
      throw new Error(`Unsupported command: ${command}`);
    }
  }
};

export {
  handleRead,
};
