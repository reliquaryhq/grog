import { ensureDb } from '../util/common.mjs';
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

  const productBuilds = await db.product.getAllApiProductBuilds({ productId });

  if (!productBuilds) {
    console.log('Product builds not found');
    return;
  }

  const mergedProductBuilds = {};

  for (const { data } of productBuilds) {
    for (const item of data.items || []) {
      if (os && item.os !== os) {
        continue;
      }

      const manifestUrl = item.urls[0].url;
      const manifestPath = `/${manifestUrl.split('/').slice(3).join('/')}`;

      mergedProductBuilds[item.build_id] = {
        build_id: item.build_id,
        generation: item.generation,
        version_name: item.version_name,
        product_id: item.product_id,
        os: item.os,
        manifest_path: manifestPath,
      };
    }
  }

  if (flags['as-json']) {
    console.log(JSON.stringify(Object.values(mergedProductBuilds), null, 2));
    return;
  }

  console.log(Object.values(mergedProductBuilds));
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
