import { pool, sql } from '../util/db.mjs';

const createCdnFile = (productId, path, expectedMd5, actualMd5, expectedSize, actualSize, isDownloaded, isVerified) =>
  pool.query(sql`
    INSERT INTO cdn_files (
      product_id,
      path,
      expected_md5,
      actual_md5,
      expected_size,
      actual_size,
      is_downloaded,
      is_verified,
      created_at,
      updated_at
    ) VALUES (
      ${productId || null},
      ${path},
      ${expectedMd5 || null},
      ${actualMd5 || null},
      ${expectedSize || null},
      ${actualSize || null},
      ${isDownloaded},
      ${isVerified},
      NOW() AT TIME ZONE 'UTC',
      NOW() AT TIME ZONE 'UTC'
    );
  `);

const getCdnFile = async (path) =>
  (await pool.query(sql`
    SELECT *
    FROM cdn_files
    WHERE path = ${path};
  `)).rows[0];

export {
  createCdnFile,
  getCdnFile,
};
