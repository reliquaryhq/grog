import { pool, sql } from '../util/db.mjs';

const createDownlink = ({
  productId,
  assetId,
  fileId,
  downlinkPath,
}) =>
  pool.query(sql`
    INSERT INTO downlinks (
      product_id,
      asset_id,
      file_id,
      downlink_path
    ) VALUES (
      ${productId},
      ${assetId},
      ${fileId},
      ${downlinkPath}
    ) RETURNING id;
  `);

const getDownlink = async ({
  productId,
  downlinkPath,
}) =>
  (await pool.query(sql`
    SELECT *
    FROM downlinks
    WHERE product_id = ${productId}
    AND downlink_path = ${downlinkPath};
  `)).rows[0];

export {
  createDownlink,
  getDownlink,
};
