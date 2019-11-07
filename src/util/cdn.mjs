import crypto from 'crypto';
import https from 'https';
import path from 'path';
import fs from 'fs-extra';
import { hashFile } from './fs.mjs';
import * as db from '../db.mjs';

const executeDownload = (agent, url, entry, tmpPath, onHeaders, onProgress) => {
  const file = fs.createWriteStream(tmpPath);
  const hash = crypto.createHash('md5').setEncoding('hex');

  const requestOptions = {
    agent,
  };

  return new Promise((resolve, reject) => {
    https.get(url, requestOptions, (response) => {
      let rejecting = false;
      let md5 = null;

      if (response.statusCode !== 200) {
        rejecting = true;

        file.end();
        hash.end();
        fs.unlinkSync(tmpPath);

        const error = new Error(`HTTP Error ${response.statusCode}`);
        error.statusCode = response.statusCode;
        reject(error);

        return;
      }

      if (onHeaders) {
        onHeaders(response.headers);
      }

      const contentLength = response.headers['content-length']
        ? parseInt(response.headers['content-length'], 10)
        : null;

      const lastModified = new Date(
        response.headers['last-modified'] || response.headers['date']
      );

      response.pipe(hash);
      response.pipe(file);

      response.on('data', (chunk) => {
        if (onProgress) {
          onProgress(entry, chunk.length);
        }
      });

      hash.on('finish', () => {
        md5 = hash.read();

        if (rejecting) {
          return;
        }

        if (entry.md5 && entry.md5 !== md5) {
          rejecting = true;

          try {
            file.end();
            fs.unlinkSync(tmpPath);
          } catch (error) {
            reject(error);
            return;
          }

          reject(new Error(`Hash mismatch: ${entry.md5} !== ${md5}`));

          return;
        }
      });

      file.on('finish', () => {
        if (rejecting) {
          return;
        }

        const { size } = fs.statSync(tmpPath);

        if (contentLength && size !== contentLength) {
          rejecting = true;

          try {
            fs.unlinkSync(tmpPath);
          } catch (error) {
            reject(error);
            return;
          }

          reject(new Error(`Content length mismatch: ${size} !== ${contentLength}`));

          return;
        }

        try {
          fs.utimesSync(tmpPath, lastModified, lastModified);
        } catch (error) {
          reject(error);
          return;
        }

        resolve({
          path: tmpPath,
          size,
          md5,
        });
      });
    });
  });
}

const downloadCdnFile = async (entry, downloadRoot, agent, onHeaders, onProgress) => {
  if (typeof entry.host !== 'string' || entry.host.length === 0) {
    throw new Error('entry.host required');
  }

  if (typeof entry.path !== 'string' || entry.path.length === 0) {
    throw new Error('entry.path required');
  }

  if (typeof downloadRoot !== 'string' || downloadRoot.length === 0) {
    throw new Error('downloadRoot required');
  }

  const url = new URL(`${entry.host}${!entry.path.startsWith('/') ? '/' : ''}${entry.path}`);

  const hostRoot = path.resolve(downloadRoot, url.hostname);
  const tmpRoot = path.resolve(downloadRoot, 'tmp');

  const downloadPath = path.resolve(hostRoot, url.pathname.slice(1));

  const tmpName = `${crypto.createHash('md5').update(downloadPath).digest('hex')}-${new Date().getTime()}`;
  const tmpPath = path.resolve(tmpRoot, `${tmpName}.grogtmp`);

  if (await fs.pathExists(downloadPath)) {
    const { size } = await fs.stat(downloadPath);

    onHeaders({ 'content-length': size });
    onProgress(entry, size);

    const cdnFile = await db.cdn.getCdnFile(url.pathname);

    if (cdnFile) {
      if (!cdnFile['is_downloaded']) {
        // TODO
      }

      return;
    }

    const md5 = await hashFile(downloadPath, 'md5');

    const isDownloaded = true;
    const isVerified = (!!entry.size && entry.size === size) || (!!entry.md5 && entry.md5 === md5);

    await db.cdn.createCdnFile(entry.productId, url.pathname, entry.md5, md5, entry.size, size, isDownloaded, isVerified);

    return;
  }

  await fs.mkdirp(path.dirname(tmpPath));

  if (await fs.pathExists(tmpPath)) {
    await fs.unlink(tmpPath);
  }

  const download = await executeDownload(agent, url, entry, tmpPath, onHeaders, onProgress);

  await fs.mkdirp(path.dirname(downloadPath));
  await fs.move(tmpPath, downloadPath);
  await fs.chmod(downloadPath, 0o444);

  const cdnFile = await db.cdn.getCdnFile(url.pathname);

  if (cdnFile) {
    if (!cdnFile['is_downloaded']) {
      // TODO
    }

    return;
  }

  const isDownloaded = true;
  const isVerified = (!!entry.size && entry.size === download.size) || (!!entry.md5 && entry.md5 === download.md5);

  await db.cdn.createCdnFile(entry.productId, url.pathname, entry.md5, download.md5, entry.size, download.size, isDownloaded, isVerified);
};

export {
  downloadCdnFile,
};
