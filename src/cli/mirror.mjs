import { ensureDb, sleep } from '../util/common.mjs';
import { mirrorProduct } from '../util/mirror.mjs';
import { loadSession, saveSession } from '../util/session.mjs';
import * as api from '../api.mjs';

const handleMirrorProduct = async (_args, flags) => {
  const session = await loadSession();

  let ownedGames = [];

  if (session) {
    console.log('Fetching list of owned games...');

    const userGames = await api.embed.getUserGames(await session.getBearer());
    ownedGames = userGames.owned;

    await saveSession(session);
  }

  if (flags['all']) {
    const { totalPages } = await api.product.getCatalogProducts(1, 'release_desc');
    const firstPage = flags['page'] ? parseInt(flags['page'], 10) : 1;

    for (let page = firstPage; page <= totalPages; page++) {
      console.log(`Mirroring catalog products from page ${page} of ${totalPages}...`);

      const { products = [] } = await api.product.getCatalogProducts(page, 'release_desc');

      for (const product of products) {
        await mirrorProduct(product.id, ownedGames);
        await sleep(1000);
      }
    }
  } else {
    const productId = parseInt(flags['product-id'], 10);

    await mirrorProduct(productId, ownedGames);
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
