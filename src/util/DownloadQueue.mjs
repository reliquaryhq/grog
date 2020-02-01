import https from 'https';
import Progress from 'progress';
import { formatBytes, formatFixedWidthString } from './string.mjs';
import { sleep } from './common.mjs';

class DownloadQueue {
  constructor(rootDir, handleDownload, delay = 0) {
    this.rootDir = rootDir;
    this.handleDownload = handleDownload;
    this.delay = delay;
    this.entries = {};
    this.totalSize = 0;
  }

  get length() {
    return Object.keys(this.entries).length;
  }

  add(entry) {
    this.entries[entry.url] = entry;

    if (entry.size) {
      this.totalSize += entry.size;
    }
  }

  async run() {
    const entries = Object.values(this.entries);
    const agent = new https.Agent({ keepAlive: true, keepAliveMsecs: 10000, maxSockets: 1 });
    let downloadedSize = 0;

    const progress = new Progress(
      'Downloading  :name  [:bar]  :etas  :current/:total entries  :downloadedSize/:totalSize',
      {
        width: 70,
        total: entries.length,
        downloadedSize: formatBytes(downloadedSize),
        totalSize: this.totalSize > 0 ? formatBytes(this.totalSize) : '?',
        name: formatFixedWidthString('', 50, 'right'),
      },
    );

    for (const entry of entries) {
      const url = new URL(entry.url);

      progress.tick(0, {
        downloadedSize: formatBytes(downloadedSize),
        totalSize: this.totalSize > 0 ? formatBytes(this.totalSize) : '?',
        name: formatFixedWidthString(url.pathname, 50, 'right'),
      });

      const onHeaders = (headers) => {
        if (!entry.size) {
          this.totalSize += parseInt(headers['content-length'], 10);
        }
      };

      const onProgress = (bytes) => {
        downloadedSize += bytes;

        progress.tick(0, {
          downloadedSize: formatBytes(downloadedSize),
          totalSize: this.totalSize > 0 ? formatBytes(this.totalSize) : '?',
          name: formatFixedWidthString(url.pathname, 50, 'right'),
        });
      };

      const { alreadyDownloaded } = await this.handleDownload(
        entry,
        this.rootDir,
        agent,
        onHeaders,
        onProgress,
      );

      if (entry.onDownloaded) {
        await entry.onDownloaded();
      }

      progress.tick(1, {
        downloadedSize: formatBytes(downloadedSize),
        totalSize: this.totalSize > 0 ? formatBytes(this.totalSize) : '?',
        name: formatFixedWidthString(url.pathname, 50, 'right'),
      });

      if (!alreadyDownloaded) {
        await sleep(this.delay);
      }
    }
  }
}

export default DownloadQueue;
