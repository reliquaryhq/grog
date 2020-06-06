import _ from 'lodash';
import { pool, sql } from '../util/db.mjs';

const createApiProductRevision = ({
  productId,
  title,
  slug,
  data,
  revision,
  revisionHash,
  revisionFirstSeenAt,
  revisionLastSeenAt,
}) =>
  pool.query(sql`
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
    );
  `);

const createApiProductBuildsRevision = ({
  productId,
  os,
  data,
  revision,
  revisionHash,
  revisionFirstSeenAt,
  revisionLastSeenAt,
}) =>
  pool.query(sql`
    INSERT INTO api_product_builds (
      product_id,
      os,
      data,
      revision,
      revision_hash,
      revision_first_seen_at,
      revision_last_seen_at
    ) VALUES (
      ${productId},
      ${os},
      ${JSON.stringify(data)},
      ${revision},
      ${revisionHash},
      ${revisionFirstSeenAt.toISOString()},
      ${revisionLastSeenAt.toISOString()}
    );
  `);

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
}) =>
  (await pool.query(sql`
    SELECT *
    FROM api_product_builds
    WHERE product_id = ${productId}
    AND os = ${os}
    AND revision = (
      SELECT max(revision)
      FROM api_product_builds
      WHERE product_id = ${productId}
      AND os = ${os}
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

const getApiProductBuildRepositoryPaths = async ({
  productId,
}) => {
  const query = await pool.query(sql`
    SELECT distinct(urls ->> 'url')
    AS url
    FROM (
      SELECT jsonb_array_elements(items -> 'urls')
      AS urls
      FROM (
        SELECT jsonb_array_elements(data -> 'items')
        AS items
        FROM api_product_builds
        WHERE product_id = ${productId}
      ) items
    ) urls
    ORDER BY url desc;
  `);

  const urls = query.rows
    .map((row) => row['url'])
    .map((url) => new URL(url).pathname);

  return _.uniq(urls).sort();
};

const getAllApiProductBuildRepositoryPaths = async () => {
  const query = await pool.query(sql`
    SELECT distinct(urls ->> 'url')
    AS url
    FROM (
      SELECT jsonb_array_elements(items -> 'urls')
      AS urls
      FROM (
        SELECT jsonb_array_elements(data -> 'items')
        AS items
        FROM api_product_builds
      ) items
    ) urls
    ORDER BY url desc;
  `);

  const urls = query.rows
    .map((row) => row['url'])
    .map((url) => new URL(url).pathname);

  return _.uniq(urls).sort();
};

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
  revision,
  revisionLastSeenAt,
}) =>
  pool.query(sql`
    UPDATE api_product_builds
    SET revision_last_seen_at = ${revisionLastSeenAt.toISOString()}
    WHERE product_id = ${productId}
    AND os = ${os}
    AND revision = ${revision};
  `);

export {
  createApiProductRevision,
  createApiProductBuildsRevision,
  getAllApiProductBuildRepositoryPaths,
  getApiProductBuildRepositoryPaths,
  getApiProduct,
  getApiProductBuilds,
  getAllApiProductBuilds,
  observeApiProductRevision,
  observeApiProductBuildsRevision,
};
