import { pool, sql } from '../util/db.mjs';

const createCdnFile = (productId, path, md5, size, verifyMd5, verifySize, isDownloaded, isVerified) =>
  pool.query(sql`
    INSERT INTO cdn_files (
      product_id,
      path,
      md5,
      size,
      verify_md5,
      verify_size,
      is_downloaded,
      is_verified,
      created_at,
      updated_at
    ) VALUES (
      ${productId || null},
      ${path},
      ${md5 || null},
      ${size || null},
      ${verifyMd5 || null},
      ${verifySize || null},
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
