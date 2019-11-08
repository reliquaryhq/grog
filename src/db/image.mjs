import { pool, sql } from '../util/db.mjs';

const createImageFile = ({
  productId = null,
  path,
  md5 = null,
  size = null,
  isDownloaded,
}) =>
  pool.query(sql`
    INSERT INTO image_files (
      product_id,
      path,
      md5,
      size,
      is_downloaded,
      created_at,
      updated_at
    ) VALUES (
      ${productId},
      ${path},
      ${md5},
      ${size},
      ${isDownloaded},
      NOW() AT TIME ZONE 'UTC',
      NOW() AT TIME ZONE 'UTC'
    );
  `);

const getImageFile = async ({ path }) =>
  (await pool.query(sql`
    SELECT *
    FROM image_files
    WHERE path = ${path};
  `)).rows[0];

export {
  createImageFile,
  getImageFile,
};
