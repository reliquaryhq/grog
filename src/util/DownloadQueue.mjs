import https from 'https';
import Progress from 'progress';
import { formatBytes, formatFixedWidthString } from './string.mjs';

class DownloadQueue {
  constructor(rootDir, handleDownload) {
    this.rootDir = rootDir;
    this.handleDownload = handleDownload;
    this.entries = {};
    this.totalSize = 0;
  }

  add(entry) {
    this.entries[entry.url] = entry;

    if (entry.size) {
      this.totalSize += entry.size;
    }
  }

  async run() {
    const entries = Object.values(this.entries);
    const agent = new https.Agent({ keepAlive: true });
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
      progress.tick(0, {
        downloadedSize: formatBytes(downloadedSize),
        totalSize: this.totalSize > 0 ? formatBytes(this.totalSize) : '?',
        name: formatFixedWidthString(entry.url, 50, 'right'),
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
          name: formatFixedWidthString(entry.url, 50, 'right'),
        });
      };

      await this.handleDownload(
        entry,
        this.rootDir,
        agent,
        onHeaders,
        onProgress,
      );

      progress.tick(1, {
        downloadedSize: formatBytes(downloadedSize),
        totalSize: this.totalSize > 0 ? formatBytes(this.totalSize) : '?',
        name: formatFixedWidthString(entry.url, 50, 'right'),
      });
    }
  }
}

export default DownloadQueue;
