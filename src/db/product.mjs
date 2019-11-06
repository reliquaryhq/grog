import _ from 'lodash';
import { pool, sql } from '../util/db.mjs';
import { getApiProductBuildsRevisionHash, getApiProductRevisionHash } from '../util/product.mjs';

const createOrUpdateApiProduct = async (productId, productData, productFetchedAt) => {
  const revisionHash = getApiProductRevisionHash(productData);
  const existingApiProduct = await getApiProduct(productId);

  if (existingApiProduct) {
    if (existingApiProduct['revision_hash'] === revisionHash) {
      console.log(`Updating api product revision last seen at; product: ${productId}; revision: ${existingApiProduct['revision']}`);

      return observeApiProductRevision(
        productId,
        existingApiProduct['revision'],
        productFetchedAt
      );
    } else {
      console.log(`Creating new api product revision; product: ${productId}; revision: ${existingApiProduct['revision'] + 1}`);

      return createApiProductRevision(
        productId,
        productData,
        existingApiProduct['revision'] + 1,
        productFetchedAt
      );
    }
  } else {
    console.log(`Creating new api product; product: ${productId}`);

    return createApiProductRevision(
      productId,
      productData,
      1,
      productFetchedAt
    );
  }
};

const createOrUpdateApiProductBuilds = async (productId, buildsOs, buildsData, buildsFetchedAt) => {
  const revisionHash = getApiProductBuildsRevisionHash(buildsData);
  const existingApiProductBuilds = await getApiProductBuilds(productId, buildsOs);

  if (existingApiProductBuilds) {
    if (existingApiProductBuilds['revision_hash'] === revisionHash) {
      console.log(`Updating api product builds revision last seen at; product: ${productId}; os: ${buildsOs}; revision: ${existingApiProductBuilds['revision']}`);

      return observeApiProductBuildsRevision(
        productId,
        buildsOs,
        existingApiProductBuilds['revision'],
        buildsFetchedAt,
      );
    } else {
      console.log(`Creating new api product builds revision; product: ${productId}; os: ${buildsOs}; revision: ${existingApiProductBuilds['revision'] + 1}`);

      return createApiProductBuildsRevision(
        productId,
        buildsOs,
        buildsData,
        existingApiProductBuilds['revision'] + 1,
        buildsFetchedAt,
      );
    }
  } else {
    console.log(`Creating new api product builds; product: ${productId}; os: ${buildsOs}`);

    return createApiProductBuildsRevision(
      productId,
      buildsOs,
      buildsData,
      1,
      buildsFetchedAt,
    );
  }
};

const createApiProductRevision = (productId, data, revision, firstSeenAt) =>
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
      ${data['title']},
      ${data['slug']},
      ${JSON.stringify(data)},
      ${revision},
      ${getApiProductRevisionHash(data)},
      ${firstSeenAt.toISOString()},
      ${firstSeenAt.toISOString()}
    );
  `);

const createApiProductBuildsRevision = (productId, os, data, revision, firstSeenAt) =>
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
      ${getApiProductBuildsRevisionHash(data)},
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

const getApiProductBuilds = async (productId, os) =>
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

const getApiProductBuildRepositoryPaths = async (productId) => {
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

const observeApiProductRevision = (productId, revision, lastSeenAt) =>
  pool.query(sql`
    UPDATE api_products
    SET revision_last_seen_at = ${lastSeenAt.toISOString()}
    WHERE product_id = ${productId}
    AND revision = ${revision};
  `);

const observeApiProductBuildsRevision = (productId, os, revision, lastSeenAt) =>
  pool.query(sql`
    UPDATE api_product_builds
    SET revision_last_seen_at = ${lastSeenAt.toISOString()}
    WHERE product_id = ${productId}
    AND os = ${os}
    AND revision = ${revision};
  `);

export {
  createOrUpdateApiProduct,
  createOrUpdateApiProductBuilds,
  getAllApiProductBuildRepositoryPaths,
  getApiProductBuildRepositoryPaths,
  getApiProduct,
  getApiProductBuilds,
};
