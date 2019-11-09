import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';
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

const verifyFile = async (path, verify = {}) => {
  if (_.has(verify, 'size')) {
    const { size } = await fs.stat(path);

    if (size !== verify.size) {
      return false;
    }
  }

  if (_.has(verify, 'hash')) {
    const hashValue = await hashFile(path, verify.hash.algorithm);

    if (hashValue !== verify.hash.value) {
      return false;
    }
  }

  return true;
};

export {
  MODULE_DIR,
  SCHEMA_DIR,
  SRC_DIR,
  hashFile,
  verifyFile,
};
