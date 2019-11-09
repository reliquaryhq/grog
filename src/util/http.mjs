import crypto from 'crypto';
import https from 'https';
import fs from 'fs-extra';
import _ from 'lodash';

const downloadFile = (agent, url, path, { verify, onHeaders, onProgress }) => {
  const file = fs.createWriteStream(path);

  const hash = _.has(verify, 'hash')
    ? crypto.createHash(verify.hash.algorithm).setEncoding(verify.hash.encoding)
    : null;

  const requestOptions = {
    agent,
  };

  return new Promise((resolve, reject) => {
    https.get(url, requestOptions, (response) => {
      let rejecting = false;

      if (response.statusCode !== 200) {
        rejecting = true;

        file.end();
        hash.end();
        fs.unlinkSync(path);

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
        response.headers['last-modified'] || response.headers['date'],
      );

      if (hash) {
        response.pipe(hash);
      }

      response.pipe(file);

      response.on('data', (chunk) => {
        if (onProgress) {
          onProgress(chunk.length);
        }
      });

      file.on('finish', () => {
        if (rejecting) {
          return;
        }

        const { size } = fs.statSync(path);
        const hashValue = hash ? hash.read() : null;

        try {
          // Prefer verifying size against known size, if available; otherwise, verify size
          // against the Content-Length header.
          if (_.has(verify, 'size') && size !== verify.size) {
            throw new Error(`Size mismatch: ${size} !== ${verify.size}`);
          } else if (contentLength !== null && size !== contentLength) {
            throw new Error(`Content length mismatch: ${size} !== ${contentLength}`);
          }

          if (_.has(verify, 'hash') && hashValue !== verify.hash.value) {
            throw new Error(`Hash mismatch: ${hashValue} !== ${verify.hash.value}`);
          }
        } catch (error) {
          rejecting = true;

          try {
            fs.unlinkSync(path);
          } catch (error) {
            reject(error);
            return;
          }

          reject(error);
        }

        try {
          fs.utimesSync(path, lastModified, lastModified);
        } catch (error) {
          reject(error);
          return;
        }

        resolve({
          path,
          size,
          hash: hashValue,
        });
      });
    });
  });
};

const getJson = (response) => response.json();

const handleError = async (response) => {
  if (response.ok) {
    return response;
  }

  const error = new Error(`${response.status} ${response.statusText}`);
  error.url = response.url;

  const body = await response.text();

  try {
    const parsedBody = JSON.parse(body);
    error.response = parsedBody;
  } catch (error) {} // eslint-disable-line

  throw error;
};

export {
  downloadFile,
  getJson,
  handleError,
};
