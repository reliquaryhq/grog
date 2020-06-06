import { ensureDb, sleep } from '../util/common.mjs';
import { mirrorProduct } from '../util/mirror.mjs';
import { shutdown } from '../util/process.mjs';
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

  const includeDepots = flags['include-depots'] || false;

  if (flags['all']) {
    const skipOwned = flags['skip-owned'];

    if (!skipOwned) {
      console.log('');
      console.log('-'.repeat(80));
      console.log('Mirroring owned games...');
      console.log('-'.repeat(80));

      for (const productId of ownedGames) {
        if (shutdown.shuttingDown) {
          return;
        }

        try {
          await mirrorProduct(productId, ownedGames, includeDepots);
        } catch (error) {
          console.error(error);
        }

        await sleep(1000);
      }
    }

    const { totalPages } = await api.product.getCatalogProducts(1, 'release_desc');
    const firstPage = flags['page'] ? parseInt(flags['page'], 10) : 1;

    for (let page = firstPage; page <= totalPages; page++) {
      console.log('');
      console.log('-'.repeat(80));
      console.log(`Mirroring catalog products from page ${page} of ${totalPages}...`);
      console.log('-'.repeat(80));

      const { products = [] } = await api.product.getCatalogProducts(page, 'release_desc');

      for (const product of products) {
        if (shutdown.shuttingDown) {
          return;
        }

        // We've already mirrored owned games above
        if (!skipOwned && ownedGames.includes(product.id)) {
          continue;
        }

        try {
          await mirrorProduct(product.id, ownedGames, includeDepots);
        } catch (error) {
          console.error(error);
        }

        await sleep(1000);
      }
    }
  } else {
    const productId = parseInt(flags['product-id'], 10);

    await mirrorProduct(productId, ownedGames, includeDepots);
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
