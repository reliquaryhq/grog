import path from 'path';
import MODULE_DIR from './moduleDir.js';

const SRC_DIR = path.resolve(MODULE_DIR, 'src');
const SCHEMA_DIR = path.resolve(SRC_DIR, 'db/schema');

export {
  MODULE_DIR,
  SCHEMA_DIR,
  SRC_DIR,
};
