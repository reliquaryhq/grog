import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import MODULE_DIR from './moduleDir.js';

const SRC_DIR = path.resolve(MODULE_DIR, 'src');
const SCHEMA_DIR = path.resolve(SRC_DIR, 'db/schema');

const hashFile = (path, algorithm, encoding = 'hex') => {
  const hash = crypto.createHash(algorithm);
  const stream = fs.createReadStream(path);

  stream.on('data', (data) => {
    hash.update(data)
  });

  return new Promise((resolve, reject) => {
    stream.on('end', () => {
      resolve(hash.digest(encoding));
    });

    stream.on('error', () => {
      reject();
    })
  });
};

export {
  MODULE_DIR,
  SCHEMA_DIR,
  SRC_DIR,
  hashFile,
};
