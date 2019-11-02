import { pool, sql } from '../util/db.mjs';
import { getProductRevisionHash } from '../util/product.mjs';

const createOrUpdateApiProduct = async (productId, data, now) => {
  const revisionHash = getProductRevisionHash(data);
  const existingProduct = await getApiProduct(productId);

  if (existingProduct) {
    if (existingProduct['revision_hash'] === revisionHash) {
      return observeApiProductRevision(
        productId,
        existingProduct['revision'],
        now
      );
    } else {
      return createApiProductRevision(
        productId,
        existingProduct['revision'] + 1,
        data,
        now
      );
    }
  } else {
    return createApiProductRevision(
      productId,
      1,
      data,
      now
    );
  }
};

const createApiProductRevision = (productId, revision, data, firstSeenAt) =>
  pool.query(sql`
    INSERT INTO api_products (
      product_id,
      title,
      slug,
      data,
      raw_data,
      revision,
      revision_hash,
      revision_first_seen_at,
      revision_last_seen_at
    ) VALUES (
      ${productId},
      ${data['title']},
      ${data['slug']},
      ${JSON.stringify(data)},
      ${JSON.stringify(data)},
      ${revision},
      ${getProductRevisionHash(data)},
      ${firstSeenAt.toISOString()},
      ${firstSeenAt.toISOString()}
    );
  `);

const getApiProduct = async (productId) =>
  (await pool.query(sql`
    SELECT *
    FROM api_products
    WHERE product_id = ${productId}
    AND revision = (
      SELECT max(revision)
      FROM api_products
      WHERE product_id = ${productId}
    );
  `)).rows[0];

const observeApiProductRevision = (productId, revision, lastSeenAt) =>
  pool.query(sql`
    UPDATE api_products
    SET revision_last_seen_at = ${lastSeenAt.toISOString()}
    WHERE product_id = ${productId}
    AND revision = ${revision};
  `);

export {
  createOrUpdateApiProduct,
  getApiProduct,
};
