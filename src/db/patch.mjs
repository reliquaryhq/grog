import { pool, sql } from '../util/db.mjs';

const createPatch = async ({
  createdAt = new Date(),
  fromBuildId,
  gogId,
  isMirrored = false,
  productId,
  repositoryPath = null,
  toBuildId,
}) => (await pool.query(sql`
  INSERT INTO patches (
    product_id,
    from_build_id,
    to_build_id,
    gog_id,
    repository_path,
    is_mirrored,
    created_at,
    updated_at
  ) VALUES (
    ${productId},
    ${fromBuildId},
    ${toBuildId},
    ${gogId.toString()},
    ${repositoryPath},
    ${isMirrored},
    ${createdAt.toISOString()},
    ${createdAt.toISOString()}
  ) RETURNING *;
`)).rows[0];

const getPatches = async ({
  fromBuildId,
  gogId,
  id,
  productId,
  toBuildId,
}) => {
  const where = [];

  if (fromBuildId === null) {
    where.push(sql`from_build_id IS NULL`);
  } else if (fromBuildId !== undefined) {
    where.push(sql`from_build_id = ${fromBuildId}`);
  }

  if (gogId === null) {
    where.push(sql`gog_id IS NULL`);
  } else if (gogId !== undefined) {
    where.push(sql`gog_id = ${gogId}`);
  }

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

  if (toBuildId === null) {
    where.push(sql`to_build_id IS NULL`);
  } else if (toBuildId !== undefined) {
    where.push(sql`to_build_id = ${toBuildId}`);
  }

  if (where.length === 0) {
    return (await pool.query(sql`
      SELECT * FROM patches
    `)).rows;
  }

  return (await pool.query(sql`
    SELECT * FROM patches
    WHERE ${sql.join(where, sql` AND `)};
  `)).rows;
};

const getPatch = async ({
  fromBuildId,
  gogId,
  id,
  productId,
  toBuildId,
}) => (await getPatches({
  id,
  fromBuildId,
  gogId,
  productId,
  toBuildId,
}))[0];

const updatePatch = async ({
  fromBuildId,
  gogId,
  id,
  isMirrored,
  productId,
  repositoryPath,
  toBuildId,
}) => {
  const updates = [];

  if (fromBuildId === null) {
    updates.push(sql`from_build_id = NULL`);
  } else if (fromBuildId !== undefined) {
    updates.push(sql`from_build_id = ${fromBuildId}`);
  }

  if (gogId === null) {
    updates.push(sql`gog_id = NULL`);
  } else if (gogId !== undefined) {
    updates.push(sql`gog_id = ${gogId.toString()}`);
  }

  if (isMirrored === null) {
    updates.push(sql`is_mirrored = NULL`);
  } else if (isMirrored !== undefined) {
    updates.push(sql`is_mirrored = ${isMirrored}`);
  }

  if (productId === null) {
    updates.push(sql`product_id = NULL`);
  } else if (productId !== undefined) {
    updates.push(sql`product_id = ${productId}`);
  }

  if (repositoryPath === null) {
    updates.push(sql`repository_path = NULL`);
  } else if (repositoryPath !== undefined) {
    updates.push(sql`repository_path = ${repositoryPath}`);
  }

  if (toBuildId === null) {
    updates.push(sql`to_build_id = NULL`);
  } else if (toBuildId !== undefined) {
    updates.push(sql`to_build_id = ${toBuildId}`);
  }

  if (updates.length > 0) {
    updates.push(sql`updated_at = ${(new Date()).toISOString()}`);

    return pool.query(sql`
      UPDATE patches
      SET ${sql.join(updates, sql`, `)}
      WHERE patches.id = ${id};
    `);
  }
};

export {
  createPatch,
  getPatch,
  getPatches,
  updatePatch,
};
