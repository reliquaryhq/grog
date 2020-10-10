import { pool, sql } from '../util/db.mjs';

const createBuild = async ({
  productId,
  gogId,
  gogLegacyId = null,
  repositoryPath = null,
  os = null,
  generation = null,
  versionName = null,
  isMirrored = false,
  isGogDb = false,
  publishedAt = null,
  createdAt = new Date(),
}) => (await pool.query(sql`
  INSERT INTO builds (
    product_id,
    gog_id,
    gog_legacy_id,
    repository_path,
    os,
    generation,
    version_name,
    is_mirrored,
    is_gogdb,
    published_at,
    created_at,
    updated_at
  ) VALUES (
    ${productId},
    ${gogId.toString()},
    ${gogLegacyId ? gogLegacyId.toString() : null},
    ${repositoryPath},
    ${os},
    ${generation},
    ${versionName},
    ${isMirrored},
    ${isGogDb},
    ${publishedAt ? publishedAt.toISOString() : null},
    ${createdAt.toISOString()},
    ${createdAt.toISOString()}
  ) RETURNING *;
`)).rows[0];

const getBuilds = async ({
  id,
  gogId,
  productId,
}) => {
  const where = [];

  if (id === null) {
    where.push(sql`id IS NULL`);
  } else if (id !== undefined) {
    where.push(sql`id = ${id}`);
  }

  if (gogId === null) {
    where.push(sql`gog_id IS NULL`);
  } else if (gogId !== undefined) {
    where.push(sql`gog_id = ${gogId}`);
  }

  if (productId === null) {
    where.push(sql`product_id IS NULL`);
  } else if (productId !== undefined) {
    where.push(sql`product_id = ${productId}`);
  }

  if (where.length === 0) {
    return (await pool.query(sql`
      SELECT * FROM builds
    `)).rows;
  }

  return (await pool.query(sql`
    SELECT * FROM builds
    WHERE ${sql.join(where, sql` AND `)};
  `)).rows;
};

const getBuild = async ({
  id,
  gogId,
  productId,
}) => (await getBuilds({
  id,
  gogId,
  productId,
}))[0];

export {
  createBuild,
  getBuild,
  getBuilds,
};
