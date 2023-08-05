import { pool, sql } from '../util/db.mjs';

const createDepot = async ({
  productId,
  manifest,
  size = null,
  compressedSize = null,
  languages = null,
  bitness = null,
  isGogDepot = false,
  isOfflineDepot = false,
  isMirrored = false,
  createdAt = new Date(),
}) => (await pool.query(sql`
  INSERT INTO depots (
    product_id,
    manifest,
    size,
    compressed_size,
    languages,
    bitness,
    is_gog_depot,
    is_offline_depot,
    is_mirrored,
    created_at,
    updated_at
  ) VALUES (
    ${productId},
    ${manifest},
    ${size},
    ${compressedSize},
    ${languages ? JSON.stringify(languages) : null},
    ${bitness ? JSON.stringify(bitness) : null},
    ${isGogDepot},
    ${isOfflineDepot},
    ${isMirrored},
    ${createdAt.toISOString()},
    ${createdAt.toISOString()}
  ) RETURNING *;
`)).rows[0];

const getDepots = async ({
  id,
  productId,
  manifest,
}) => {
  const where = [];

  if (id === null) {
    where.push(sql`id IS NULL`);
  } else if (id !== undefined) {
    where.push(sql`id = ${id}`);
  }

  if (productId === null) {
    where.push(sql`product_id IS NULL`);
  } else if (productId !== undefined) {
    where.push(sql`product_id = ${productId}`);
  }

  if (manifest === null) {
    where.push(sql`manifest IS NULL`);
  } else if (manifest !== undefined) {
    where.push(sql`manifest = ${manifest}`);
  }

  if (where.length === 0) {
    return (await pool.query(sql`
      SELECT * FROM depots
    `)).rows;
  }

  return (await pool.query(sql`
    SELECT * FROM depots
    WHERE ${sql.join(where, sql` AND `)};
  `)).rows;
};

const getDepot = async ({
  id,
  productId,
  manifest,
}) => (await getDepots({
  id,
  productId,
  manifest,
}))[0];

const updateDepot = async ({
  id,
  isMirrored,
}) => {
  const updates = [];

  if (isMirrored === null) {
    updates.push(sql`is_mirrored = NULL`);
  } else if (isMirrored !== undefined) {
    updates.push(sql`is_mirrored = ${isMirrored}`);
  }

  if (updates.length > 0) {
    updates.push(sql`updated_at = ${(new Date()).toISOString()}`);

    return pool.query(sql`
      UPDATE depots
      SET ${sql.join(updates, sql`, `)}
      WHERE depots.id = ${id};
    `);
  }
};

export {
  createDepot,
  getDepot,
  getDepots,
  updateDepot,
};
