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
    const request = https.get(url, requestOptions, (response) => {
      let rejecting = false;

      if (response.statusCode !== 200) {
        rejecting = true;

        try {
          file.end();
          if (hash) {
            hash.end();
          }
          fs.unlinkSync(path);
        } catch (error) {
          // ignore errors
        }

        const error = new Error(`HTTP Error ${response.statusCode}`);
        error.statusCode = response.statusCode;

        response.resume();

        reject(error);

        return;
      }

      if (onHeaders) {
        onHeaders(response.headers);
      }

      const contentLength = response.headers['content-length']
        ? parseInt(response.headers['content-length'], 10)
        : null;

      const lastModified = response.headers['last-modified']
        ? new Date(response.headers['last-modified'])
        : null;

      const date = response.headers['date']
        ? new Date(response.headers['date'])
        : null;

      const now = new Date();

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

        if (!fs.existsSync(path)) {
          console.error(`File unavailable in finish event: ${path}`);
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
          return;
        }

        try {
          fs.utimesSync(path, lastModified || date || now, lastModified || date || now);
        } catch (error) {
          reject(error);
          return;
        }

        const download = {
          size,
          lastModified,
          contentType: response.headers['content-type'] || null,
          headers: response.rawHeaders,
          statusCode: response.statusCode,
          statusText: response.statusMessage,
        };

        if (hash) {
          download.hash = {
            algorithm: verify.hash.algorithm,
            encoding: verify.hash.encoding,
            value: hashValue,
          };
        }

        resolve(download);
      });
    });

    request.on('error', (error) => {
      try {
        file.end();
        if (hash) {
          hash.end();
        }
        fs.unlinkSync(path);
      } catch (error) {
        // ignore errors
      }

      reject(error);
    });
  });
};

const getJson = (response) => response.json();

const getQuery = (attributes) =>
  Object.entries(attributes)
    .map(([ key, value ]) => value === null || value === undefined ? null : `${key}=${encodeURIComponent(value)}`)
    .filter((pair) => pair !== null)
    .join('&');

const handleError = async (response) => {
  if (response.ok || response.status === 301 || response.status === 302) {
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
  getQuery,
  handleError,
};
