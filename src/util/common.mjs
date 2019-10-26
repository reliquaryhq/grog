import fs from 'fs-extra';
import { migrate, pool, sql } from '../db.mjs';

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

export {
  ensureDb,
  ensureInit,
};
