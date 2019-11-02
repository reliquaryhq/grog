import crypto from 'crypto';
import fs from 'fs-extra';
import { migrate, pool, sql } from './db.mjs';

const ensureInit = async () => {
  if (!(await fs.pathExists('.env'))) {
    throw new Error('Grog not initialized');
  }
};

const ensureDb = async () => {
  await ensureInit();

  try {
    await pool.query(sql`SELECT 1;`);
  } catch (error) {
    throw new Error('Database connection failed');
  }

  await migrate();
};

const hashObject = (object) => crypto.createHash('sha256')
  .update(JSON.stringify(object))
  .digest('hex');

const sleep = (milliseconds) =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const sortAsNumbers = (a, b) => a - b;

const sortObject = (object) => Object.keys(object)
  .sort()
  .reduce((r, key) => (r[key] = object[key], r), {});

export {
  ensureDb,
  ensureInit,
  hashObject,
  sleep,
  sortAsNumbers,
  sortObject,
};
