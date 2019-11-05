import { ensureDb } from '../util/common.mjs';
import * as db from '../db.mjs';

const handleReadProduct = async (_args, flags) => {
  const productId = flags['product-id'];

  const product = await db.product.getApiProduct(productId);

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

  const productBuilds = await db.product.getApiProductBuilds(productId, os);

  if (flags['only-data']) {
    console.log(JSON.stringify(productBuilds['data'], null, 2));
    return;
  }

  console.log(JSON.stringify({
    'id': productBuilds['product_id'],
    'revision': productBuilds['revision'],
    'revision_first_seen_at': new Date(productBuilds['revision_first_seen_at']).toISOString(),
    'revision_last_seen_at': new Date(productBuilds['revision_first_seen_at']).toISOString(),
  }, null, 2));
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
