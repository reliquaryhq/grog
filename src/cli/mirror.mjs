import { ensureDb } from '../util/common.mjs';
import { mirrorProduct } from '../util/mirror.mjs';

const handleMirrorProduct = async (_args, flags) => {
  const productId = flags['product-id'];
  await mirrorProduct(productId);
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
