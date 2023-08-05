import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';
import { retry } from './common.mjs';
import { hashFile, verifyFile } from './fs.mjs';
import { downloadFile } from './http.mjs';
import * as db from '../db.mjs';

const DEFAULT_HASH_ALGORITHM = 'md5';
const DEFAULT_HASH_ENCODING = 'hex';

const downloadAsset = async (entry, rootDir, agent, onHeaders, onProgress) => {
  if (typeof entry.url !== 'string' || entry.url.length === 0) {
    throw new Error('entry.url required');
  }

  if (typeof rootDir !== 'string' || rootDir.length === 0) {
    throw new Error('rootDir required');
  }

  const verify = _.pick(entry, ['hash', 'size']);
  const url = new URL(entry.url);
  const hostname = entry.hostname || url.hostname;

  const hostDir = path.resolve(rootDir, hostname);
  const tmpDir = path.resolve(rootDir, 'tmp');

  const downloadPath = path.resolve(hostDir, url.pathname.slice(1));
  const tmpName = crypto.createHash('md5').update(downloadPath).digest('hex')
    + '-'
    + new Date().getTime()
    + '.grogtmp';
  const tmpPath = path.resolve(tmpDir, tmpName);

  if (await fs.pathExists(downloadPath)) {
    const { size } = await fs.stat(downloadPath);

    onHeaders({ 'content-length': size });
    onProgress(size);

    const asset = await syncAsset(entry, downloadPath);

    return {
      alreadyDownloaded: true,
      isSuccessful: asset.isSynced,
      asset,
    };
  }

  await fs.mkdirp(path.dirname(tmpPath));

  if (await fs.pathExists(tmpPath)) {
    await fs.unlink(tmpPath);
  }

  let download;

  await retry(4, 250, async (_attempt, _error) => {
    download = await downloadFile(agent, url, tmpPath, { verify, onHeaders, onProgress });
  });

  await fs.mkdirp(path.dirname(downloadPath));
  await fs.move(tmpPath, downloadPath);
  await fs.chmod(downloadPath, 0o444);

  const asset = await syncAsset(entry, downloadPath, {
    hash: download.hash,
    lastModified: download.lastModified,
    contentType: download.contentType || null,
    headers: download.headers || null,
    statusCode: download.statusCode || null,
    statusText: download.statusText || null,
  });

  return {
    alreadyDownloaded: false,
    isSuccessful: asset.isSynced,
    asset,
  };
};

const getAssetHash = async (downloadPath, algorithm, encoding) => {
  return {
    algorithm,
    encoding,
    value: await hashFile(downloadPath, algorithm, encoding),
  };
};

const readAsset = (entry, rootDir) => {
  if (typeof entry.url !== 'string' || entry.url.length === 0) {
    throw new Error('entry.url required');
  }

  if (typeof rootDir !== 'string' || rootDir.length === 0) {
    throw new Error('rootDir required');
  }

  const url = new URL(entry.url);
  const hostname = entry.hostname || url.hostname;
  const hostDir = path.resolve(rootDir, hostname);
  const assetPath = path.resolve(hostDir, url.pathname.slice(1));

  return fs.readFile(assetPath);
};

const syncAsset = async (entry, downloadPath, known = {}) => {
  const verify = _.pick(entry, ['hash', 'size']);
  const canVerify = !_.isEmpty(verify);
  const url = new URL(entry.url);
  const hostname = entry.hostname || url.hostname;

  const stat = await fs.stat(downloadPath);

  const size = stat.size;
  const lastModified = hostname === 'cdn.gog.com'
    ? known.lastModified || stat.mtime
    : null;

  const asset = await db.asset.getAsset({ host: hostname, path: url.pathname });

  if (asset) {
    const updates = {};

    if (!asset['hash_value']) {
      updates.hash = known.hash || await getAssetHash(
        downloadPath,
        _.get(verify, 'hash.algorithm', DEFAULT_HASH_ALGORITHM),
        _.get(verify, 'hash.encoding', DEFAULT_HASH_ENCODING),
      );
    }

    if (!asset['is_downloaded']) {
      updates.isDownloaded = true;
    }

    if (!asset['is_verified'] && canVerify) {
      updates.isVerified = await verifyFile(downloadPath, verify, known);
    }

    if (!asset['last_modified'] && lastModified) {
      updates.lastModified = lastModified;
    }

    if (!asset['asset_type_id']) {
      updates.type = entry.type;
    }

    if (asset['product_id'] !== entry.productId) {
      updates.productId = entry.productId;
    }

    await db.asset.updateAsset({
      id: asset.id,
      ...updates,
    });

    return {
      id: asset['id'],
      isSynced: !canVerify || !!(updates.isVerified || asset['is_verified']),
    };
  }

  const hash = known.hash || await getAssetHash(
    downloadPath,
    _.get(verify, 'hash.algorithm', 'md5'),
    _.get(verify, 'hash.encoding', 'hex'),
  );

  const isVerified = canVerify ? await verifyFile(downloadPath, verify, known) : false;

  const result = await db.asset.createAsset({
    productId: entry.productId,
    host: hostname,
    path: url.pathname,
    hash,
    size,
    verifyHash: verify.hash,
    verifySize: verify.size,
    isDownloaded: true,
    isVerified,
    assetType: entry.type,
    lastModified,
    contentType: known.contentType,
  });

  const assetId = result.rows[0]['id'];

  if (known.headers) {
    await db.asset.createAssetResponse({
      assetId,
      headers: known.headers,
      statusCode: known.statusCode,
      statusText: known.statusText,
    });
  }

  return {
    id: result.rows[0]['id'],
    isSynced: !canVerify || isVerified,
  };
};

export {
  downloadAsset,
  readAsset,
};
