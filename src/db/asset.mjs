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
      asset_type_id
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
      (SELECT id FROM asset_types WHERE slug = ${type})
    );
  `);

const getAsset = async ({ host, path }) =>
  (await pool.query(sql`
    SELECT *
    FROM assets
    WHERE host = ${host}
    AND path = ${path};
  `)).rows[0];

export {
  createAsset,
  getAsset,
};
