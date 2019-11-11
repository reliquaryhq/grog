import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';
import { hashFile, verifyFile } from './fs.mjs';
import { downloadFile } from './http.mjs';
import * as db from '../db.mjs';

const downloadAsset = async (entry, rootDir, agent, onHeaders, onProgress) => {
  if (typeof entry.url !== 'string' || entry.url.length === 0) {
    throw new Error('entry.url required');
  }

  if (typeof rootDir !== 'string' || rootDir.length === 0) {
    throw new Error('rootDir required');
  }

  const url = new URL(entry.url);

  const hostDir = path.resolve(rootDir, url.hostname);
  const tmpDir = path.resolve(rootDir, 'tmp');

  const downloadPath = path.resolve(hostDir, url.pathname.slice(1));

  const tmpName = crypto.createHash('md5').update(downloadPath).digest('hex')
    + '-'
    + new Date().getTime()
    + '.grogtmp';
  const tmpPath = path.resolve(tmpDir, tmpName);

  const verify = _.pick(entry, ['hash', 'size']);

  if (await fs.pathExists(downloadPath)) {
    const hash = {
      algorithm: _.get(verify, 'hash.algorithm', 'md5'),
      encoding: _.get(verify, 'hash.encoding', 'hex'),
    };
    hash.value = await hashFile(downloadPath, hash.algorithm, hash.encoding);
    const { size } = await fs.stat(downloadPath);

    onHeaders({ 'content-length': size });
    onProgress(size);

    const isDownloaded = true;
    const isVerified = await verifyFile(downloadPath, verify);

    const asset = await db.asset.getAsset({ host: url.hostname, path: url.pathname });

    if (asset) {
      if (!asset['is_downloaded']) {
        // TODO
      }

      if (!asset['is_verified']) {
        // TODO
      }

      return;
    }

    await db.asset.createAsset({
      productId: entry.productId,
      host: url.hostname,
      path: url.pathname,
      hash,
      size,
      verifyHash: verify.hash,
      verifySize: verify.size,
      isDownloaded,
      isVerified,
    });

    return;
  }

  await fs.mkdirp(path.dirname(tmpPath));

  if (await fs.pathExists(tmpPath)) {
    await fs.unlink(tmpPath);
  }

  const download = await downloadFile(agent, url, tmpPath,
    {
      verify,
      onHeaders,
      onProgress,
    },
  );

  await fs.mkdirp(path.dirname(downloadPath));
  await fs.move(tmpPath, downloadPath);
  await fs.chmod(downloadPath, 0o444);

  const asset = await db.asset.getAsset({ host: url.hostname, path: url.pathname });

  const isDownloaded = true;
  const isVerified = await verifyFile(downloadPath, verify);

  if (asset) {
    if (!asset['is_downloaded']) {
      // TODO
    }

    if (!asset['is_verified']) {
      // TODO
    }

    return;
  }

  await db.asset.createAsset({
    productId: entry.productId,
    host: url.hostname,
    path: url.pathname,
    hash: download.hash,
    size: download.size,
    verifyHash: verify.hash,
    verifySize: verify.size,
    isDownloaded,
    isVerified,
  });
};

export {
  downloadAsset,
};
