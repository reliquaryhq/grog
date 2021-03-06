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
  branch = null,
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
    updated_at,
    branch
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
    ${createdAt.toISOString()},
    ${branch}
  ) RETURNING *;
`)).rows[0];

const getBuilds = async ({
  id,
  gogId,
  gogLegacyId,
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

  if (gogLegacyId === null) {
    where.push(sql`gog_legacy_id IS NULL`);
  } else if (gogLegacyId !== undefined) {
    where.push(sql`gog_legacy_id = ${gogLegacyId}`);
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
  gogLegacyId,
  productId,
}) => (await getBuilds({
  id,
  gogId,
  gogLegacyId,
  productId,
}))[0];

const updateBuild = async ({
  id,
  productId,
  gogId,
  gogLegacyId,
  repositoryPath,
  os,
  generation,
  versionName,
  isMirrored,
  isGogDb,
  publishedAt,
  branch,
}) => {
  const updates = [];

  if (productId === null) {
    updates.push(sql`product_id = NULL`);
  } else if (productId !== undefined) {
    updates.push(sql`product_id = ${productId}`);
  }

  if (gogId === null) {
    updates.push(sql`gog_id = NULL`);
  } else if (gogId !== undefined) {
    updates.push(sql`gog_id = ${gogId.toString()}`);
  }

  if (gogLegacyId === null) {
    updates.push(sql`gog_legacy_id = NULL`);
  } else if (gogLegacyId !== undefined) {
    updates.push(sql`gog_legacy_id = ${gogLegacyId.toString()}`);
  }

  if (repositoryPath === null) {
    updates.push(sql`repository_path = NULL`);
  } else if (repositoryPath !== undefined) {
    updates.push(sql`repository_path = ${repositoryPath}`);
  }

  if (os === null) {
    updates.push(sql`os = NULL`);
  } else if (os !== undefined) {
    updates.push(sql`os = ${os}`);
  }

  if (generation === null) {
    updates.push(sql`generation = NULL`);
  } else if (generation !== undefined) {
    updates.push(sql`generation = ${generation}`);
  }

  if (versionName === null) {
    updates.push(sql`version_name = NULL`);
  } else if (versionName !== undefined) {
    updates.push(sql`version_name = ${versionName}`);
  }

  if (isMirrored === null) {
    updates.push(sql`is_mirrored = NULL`);
  } else if (isMirrored !== undefined) {
    updates.push(sql`is_mirrored = ${isMirrored}`);
  }

  if (isGogDb === null) {
    updates.push(sql`is_gogdb = NULL`);
  } else if (isGogDb !== undefined) {
    updates.push(sql`is_gogdb = ${isGogDb}`);
  }

  if (publishedAt === null) {
    updates.push(sql`published_at = NULL`);
  } else if (publishedAt !== undefined) {
    updates.push(sql`published_at = ${publishedAt.toISOString()}`);
  }

  if (branch === null) {
    updates.push(sql`branch = NULL`);
  } else if (branch !== undefined) {
    updates.push(sql`branch = ${branch}`);
  }

  if (updates.length > 0) {
    updates.push(sql`updated_at = ${(new Date()).toISOString()}`);

    return pool.query(sql`
      UPDATE builds
      SET ${sql.join(updates, sql`, `)}
      WHERE builds.id = ${id};
    `);
  }
};

const createBuildDepot = async ({
  buildId,
  depotId,
}) => (await pool.query(sql`
  INSERT INTO build_depots (
    build_id,
    depot_id
  ) VALUES (
    ${buildId},
    ${depotId}
  ) RETURNING *;
`)).rows[0];

const getBuildDepots = async ({
  buildId,
  depotId,
}) => {
  const where = [];

  if (buildId === null) {
    where.push(sql`build_id IS NULL`);
  } else if (buildId !== undefined) {
    where.push(sql`build_id = ${buildId}`);
  }

  if (depotId === null) {
    where.push(sql`depot_id IS NULL`);
  } else if (depotId !== undefined) {
    where.push(sql`depot_id = ${depotId}`);
  }

  if (where.length === 0) {
    return (await pool.query(sql`
      SELECT * FROM build_depots
    `)).rows;
  }

  return (await pool.query(sql`
    SELECT * FROM build_depots
    WHERE ${sql.join(where, sql` AND `)};
  `)).rows;
};

const getBuildDepot = async ({
  buildId,
  depotId,
}) => (await getBuildDepots({
  buildId,
  depotId,
}))[0];

export {
  createBuild,
  getBuild,
  getBuilds,
  updateBuild,
  createBuildDepot,
  getBuildDepot,
  getBuildDepots,
};
