import * as db from '../../db.mjs';
import { createBuildsFromApiProductBuilds } from '../../util/build.mjs';
import { createProductFromApiProduct } from '../../util/product.mjs';

const up = async (connection, sql) => {
  await connection.query(sql`
    CREATE TABLE products (
      id BIGSERIAL PRIMARY KEY,
      gog_id TEXT NOT NULL UNIQUE,
      title TEXT,
      slug TEXT,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );

    CREATE TABLE builds (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      gog_id TEXT NOT NULL UNIQUE,
      gog_legacy_id TEXT,
      repository_path TEXT,
      os TEXT,
      generation INTEGER,
      version_name TEXT,
      is_mirrored BOOLEAN DEFAULT FALSE,
      is_gogdb BOOLEAN DEFAULT FALSE,
      published_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );
  `);

  const migrateProductGogIds = (await connection.query(sql`
    SELECT DISTINCT(product_id)
    FROM api_products;
  `)).rows.map(row => row.product_id);

  for (const productGogId of migrateProductGogIds) {
    const apiProduct = await db.product.getApiProduct({ productId: productGogId });
    const product = await createProductFromApiProduct(apiProduct);

    const allApiProductBuilds = await db.product.getAllApiProductBuilds({ productId: productGogId });
    for (const apiProductBuilds of allApiProductBuilds) {
      await createBuildsFromApiProductBuilds(product, apiProductBuilds);
    }
  }
};

const down = async (connection, sql) => {
  return connection.query(sql`
    DROP TABLE products;
    DROP TABLE builds;
  `);
};

export { up, down };
