import { pool, sql } from '../util/db.mjs';

const createAsset = ({
  productId = null,
  host,
  path,
  hash = null,
  size = null,
  verifyHash = null,
  verifySize = null,
  isDownloaded,
  isVerified,
  type = null,
  lastModified = null,
}) =>
  pool.query(sql`
    INSERT INTO assets (
      product_id,
      host,
      path,
      hash_algorithm,
      hash_encoding,
      hash_value,
      size,
      verify_hash_algorithm,
      verify_hash_encoding,
      verify_hash_value,
      verify_size,
      is_downloaded,
      is_verified,
      created_at,
      updated_at,
      asset_type_id,
      last_modified
    ) VALUES (
      ${productId},
      ${host},
      ${path},
      ${hash ? hash.algorithm : null},
      ${hash ? hash.encoding : null},
      ${hash ? hash.value : null},
      ${size},
      ${verifyHash ? verifyHash.algorithm : null},
      ${verifyHash ? verifyHash.encoding : null},
      ${verifyHash ? verifyHash.value : null},
      ${verifySize},
      ${isDownloaded},
      ${isVerified},
      NOW() AT TIME ZONE 'UTC',
      NOW() AT TIME ZONE 'UTC',
      (SELECT id FROM asset_types WHERE slug = ${type}),
      ${lastModified ? lastModified.toISOString() : null}
    ) RETURNING id;
  `);

const getAsset = async ({ host, path }) =>
  (await pool.query(sql`
    SELECT *
    FROM assets
    WHERE host = ${host}
    AND path = ${path};
  `)).rows[0];

const getAssetById = async ({ id }) =>
  (await pool.query(sql`
    SELECT *
    FROM assets
    WHERE id = ${id};
  `)).rows[0];

const updateAsset = async ({
  id,
  hash,
  isDownloaded,
  isVerified,
  lastModified,
  type,
  productId,
}) => {
  const updates = [];

  if (hash === null) {
    updates.push(sql`hash_algorithm = NULL`);
    updates.push(sql`hash_encoding = NULL`);
    updates.push(sql`hash_value = NULL`);
  } else if (hash !== undefined) {
    updates.push(sql`hash_algorithm = ${hash.algorithm}`);
    updates.push(sql`hash_encoding = ${hash.encoding}`);
    updates.push(sql`hash_value = ${hash.value}`);
  }

  if (isDownloaded === null) {
    updates.push(sql`is_downloaded = NULL`);
  } else if (isDownloaded !== undefined) {
    updates.push(sql`is_downloaded = ${isDownloaded}`);
  }

  if (isVerified === null) {
    updates.push(sql`is_verified = NULL`);
  } else if (isVerified !== undefined) {
    updates.push(sql`is_verified = ${isVerified}`);
  }

  if (lastModified === null) {
    updates.push(sql`last_modified = NULL`);
  } else if (lastModified !== undefined) {
    updates.push(sql`last_modified = ${lastModified.toISOString()}`);
  }

  if (type === null) {
    updates.push(sql`asset_type_id = NULL`);
  } else if (type !== undefined) {
    updates.push(sql`asset_type_id = (SELECT id FROM asset_types WHERE slug = ${type})`);
  }

  if (productId === null) {
    updates.push(sql`product_id = NULL`);
  } else if (type !== undefined) {
    updates.push(sql`product_id = ${productId}`);
  }

  if (updates.length > 0) {
    updates.push(sql`updated_at = NOW() AT TIME ZONE 'utc'`);

    return pool.query(sql`
      UPDATE assets
      SET ${sql.join(updates, sql`, `)}
      WHERE assets.id = ${id};
    `);
  }
};

export {
  createAsset,
  getAsset,
  getAssetById,
  updateAsset,
};
