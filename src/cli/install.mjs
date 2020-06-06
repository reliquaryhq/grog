import { ensureDb } from '../util/common.mjs';
import { getProductBuilds, installProduct } from '../util/product.mjs';

const handleInstallProduct = async (args, flags) => {
  const productId = flags['product-id'];
  const buildId = flags['build-id'];
  const destination = flags['destination'];

  await installProduct(productId, buildId, destination);
};

const handleInstall = async ([command, ...args], flags) => {
  await ensureDb();

  switch (command) {
    case 'product': {
      return handleInstallProduct(args, flags);
    }

    default: {
      throw new Error(`Unsupported command: ${command}`);
    }
  }
};

export {
  handleInstall,
};
