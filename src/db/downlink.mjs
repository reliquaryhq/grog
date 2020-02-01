import { pool, sql } from '../util/db.mjs';

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
  getDownlink,
};
