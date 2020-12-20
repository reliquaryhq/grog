import { pool, sql } from '../util/db.mjs';

const createProduct = async ({
  gogId,
  title = null,
  slug = null,
  createdAt = new Date(),
}) => (await pool.query(sql`
  INSERT INTO products (
    gog_id,
    title,
    slug,
    created_at,
    updated_at
  ) VALUES (
    ${gogId.toString()},
    ${title},
    ${slug},
    ${createdAt.toISOString()},
    ${createdAt.toISOString()}
  ) RETURNING *;
`)).rows[0];

const getProduct = async ({
  id,
  gogId,
}) => {
  if (id) {
    const query = await pool.query(sql`
      SELECT *
      FROM products
      WHERE id = ${id};
    `);

    return query.rows[0];
  }

  if (gogId) {
    const query = await pool.query(sql`
      SELECT *
      FROM products
      WHERE gog_id = ${gogId.toString()};
    `);

    return query.rows[0];
  }

  throw new Error('id or gogId is required');
};

const createApiProductRevision = async ({
  productId,
  title,
  slug,
  data,
  revision,
  revisionHash,
  revisionFirstSeenAt,
  revisionLastSeenAt,
}) =>
  (await pool.query(sql`
    INSERT INTO api_products (
      product_id,
      title,
      slug,
      data,
      revision,
      revision_hash,
      revision_first_seen_at,
      revision_last_seen_at
    ) VALUES (
      ${productId},
      ${title},
      ${slug},
      ${JSON.stringify(data)},
      ${revision},
      ${revisionHash},
      ${revisionFirstSeenAt.toISOString()},
      ${revisionLastSeenAt.toISOString()}
    ) RETURNING *;
  `)).rows[0];

const createApiProductBuildsRevision = async ({
  productId,
  os,
  password,
  data,
  revision,
  revisionHash,
  revisionFirstSeenAt,
  revisionLastSeenAt,
}) =>
  (await pool.query(sql`
    INSERT INTO api_product_builds (
      product_id,
      os,
      password,
      data,
      revision,
      revision_hash,
      revision_first_seen_at,
      revision_last_seen_at
    ) VALUES (
      ${productId},
      ${os},
      ${password},
      ${JSON.stringify(data)},
      ${revision},
      ${revisionHash},
      ${revisionFirstSeenAt.toISOString()},
      ${revisionLastSeenAt.toISOString()}
    ) RETURNING *;
  `)).rows[0];

const getApiProduct = async ({
  productId,
}) =>
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

const getApiProductBuilds = async ({
  productId,
  os,
  password,
}) =>
  (await pool.query(sql`
    SELECT *
    FROM api_product_builds
    WHERE product_id = ${productId}
    AND os = ${os}
    AND password ${password === null ? sql`IS NULL` : sql`= ${password}`}
    AND revision = (
      SELECT max(revision)
      FROM api_product_builds
      WHERE product_id = ${productId}
      AND os = ${os}
      AND password ${password === null ? sql`IS NULL` : sql`= ${password}`}
    );
  `)).rows[0];

const getAllApiProductBuilds = async ({
  productId,
}) =>
  (await pool.query(sql`
    SELECT *
    FROM api_product_builds
    WHERE product_id = ${productId};
  `)).rows;

const observeApiProductRevision = ({
  productId,
  revision,
  revisionLastSeenAt,
}) =>
  pool.query(sql`
    UPDATE api_products
    SET revision_last_seen_at = ${revisionLastSeenAt.toISOString()}
    WHERE product_id = ${productId}
    AND revision = ${revision};
  `);

const observeApiProductBuildsRevision = ({
  productId,
  os,
  password,
  revision,
  revisionLastSeenAt,
}) =>
  pool.query(sql`
    UPDATE api_product_builds
    SET revision_last_seen_at = ${revisionLastSeenAt.toISOString()}
    WHERE product_id = ${productId}
    AND os = ${os}
    AND password ${password === null ? sql`IS NULL` : sql`= ${password}`}
    AND revision = ${revision};
  `);

export {
  createProduct,
  getProduct,
  createApiProductRevision,
  createApiProductBuildsRevision,
  getApiProduct,
  getApiProductBuilds,
  getAllApiProductBuilds,
  observeApiProductRevision,
  observeApiProductBuildsRevision,
};
