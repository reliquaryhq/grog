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

const retry = async (maxAttempts, delay, func, attempt = 0, error = null) => {
  if (attempt >= maxAttempts) {
    if (error) {
      throw error;
    }

    return;
  }

  try {
    return await func(attempt, error);
  } catch (error) {
    if (delay !== 0) {
      await sleep(delay);
    }

    return await retry(maxAttempts, delay, func, attempt + 1, error);
  }
};

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
  retry,
  sleep,
  sortAsNumbers,
  sortObject,
};
