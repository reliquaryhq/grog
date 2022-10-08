import { globby } from 'globby';
import path from 'path';
import slonik from 'slonik';
import { SCHEMA_DIR } from './fs.mjs';
import { env } from './process.mjs';

const { createPool, sql } = slonik;

const {
  GROG_POSTGRES_HOST,
  GROG_POSTGRES_PORT,
  GROG_POSTGRES_USER,
  GROG_POSTGRES_PASSWORD,
  GROG_POSTGRES_DB,
} = env;

const CONNECTION_STRING = `postgres://${GROG_POSTGRES_USER}:${GROG_POSTGRES_PASSWORD}@${GROG_POSTGRES_HOST}:${GROG_POSTGRES_PORT}/${GROG_POSTGRES_DB}`;

const pool = createPool(CONNECTION_STRING);

const formatSchemaVersion = (version) => version.toString().padStart(4, '0');

const getCurrentSchemaVersion = async () => {
  const exists = await pool.query(sql`SELECT to_regclass('public.schema');`);

  // Fresh database
  if (exists.rows[0].to_regclass === null) {
    return -1;
  }

  const version = await pool.query(sql`SELECT MAX(version) AS version FROM schema;`);
  return version.rows[0].version;
};

const getNewestSchemaVersion = async () => {
  const migrations = await globby(`${SCHEMA_DIR}/*.mjs`);

  // No migrations
  if (migrations.length === 0) {
    return -1;
  }

  const newest = migrations.sort().slice(-1)[0];
  const version = path.basename(newest, '.mjs');
  return parseInt(version, 10);
};

const applyMigration = async (connection, version, direction) => {
  if (direction === 'up') {
    console.log(`Upgrading database schema to ${formatSchemaVersion(version)}`);
  }

  if (direction === 'down') {
    console.log(`Downgrading database schema from ${formatSchemaVersion(version)}`);
  }

  const migrationFile = `${version.toString().padStart(4, '0')}.mjs`;
  const migrationPath = path.resolve(SCHEMA_DIR, migrationFile);
  const migration = await import(migrationPath);

  if (direction === 'up') {
    await migration.up(connection, sql);
    await connection.query(sql`INSERT INTO schema (version) VALUES (${version});`);
  }

  if (direction === 'down') {
    await migration.down(connection, sql);

    if (version > 0) {
      await connection.query(sql`DELETE FROM schema WHERE version = ${version};`);
    }
  }
};

const migrate = async (to = null) => {
  const newestVersion = await getNewestSchemaVersion();
  const fromVersion = await getCurrentSchemaVersion();
  const toVersion = to === null ? newestVersion : to;

  if (toVersion > newestVersion || toVersion < -1) {
    throw new Error(`Invalid target version ${formatSchemaVersion(toVersion)}`);
  }

  await pool.connect(async (c) => {
    if (fromVersion < toVersion) {
      for (let version = fromVersion + 1; version <= toVersion; version++) {
        await applyMigration(c, version, 'up');
      }
    }

    if (fromVersion > toVersion) {
      for (let version = fromVersion; version > toVersion; version--) {
        await applyMigration(c, version, 'down');
      }
    }
  });
};

export {
  migrate,
  pool,
  sql,
};
