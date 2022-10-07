import https from 'https';
import Progress from 'progress';
import pLimit from 'p-limit';
import { shutdown } from './process.mjs';
import { formatBytes, formatFixedWidthString } from './string.mjs';
import { sleep } from './common.mjs';

class DownloadQueue {
  constructor(rootDir, handleDownload, delay = 0, concurrency = 1) {
    this.rootDir = rootDir;
    this.handleDownload = handleDownload;
    this.delay = delay;
    this.entries = {};
    this.totalSize = 0;
    this.concurrency = concurrency;
  }

  get length() {
    return Object.keys(this.entries).length;
  }

  add(entry) {
    if (this.entries[entry.url]) {
      return;
    }

    this.entries[entry.url] = entry;

    if (entry.size) {
      this.totalSize += entry.size;
    }
  }

  async run() {
    const entries = Object.values(this.entries);
    const concurrency = Math.min(entries.length, this.concurrency);
    const agent = new https.Agent({ keepAlive: true, maxSockets: concurrency + 1 });
    const limiter = pLimit(concurrency);
    let downloadedSize = 0;

    const progress = new Progress(
      'Downloading  :item  [:bar]  :etas  :current/:total entries  :downloadedSize/:totalSize',
      {
        width: 70,
        total: entries.length,
        downloadedSize: formatBytes(downloadedSize),
        totalSize: this.totalSize > 0 ? formatBytes(this.totalSize) : '?',
        item: formatFixedWidthString('', 50, 'right'),
      },
    );

    const updateProgress = (tick, item) => {
      const formattedItem = concurrency === 1
        ? formatFixedWidthString(item, 50, 'right')
        : formatFixedWidthString(`${concurrency} urls at a time`, 50, 'left');

      progress.tick(tick, {
        downloadedSize: formatBytes(downloadedSize),
        totalSize: this.totalSize > 0 ? formatBytes(this.totalSize) : '?',
        item: formattedItem,
      });
    };

    const downloadEntry = async (entry) => {
      if (shutdown.shuttingDown) {
        return;
      }

      const url = new URL(entry.url);

      updateProgress(0, url.pathname);

      const onHeaders = (headers) => {
        if (!entry.size) {
          this.totalSize += parseInt(headers['content-length'], 10);
        }
      };

      const onProgress = (bytes) => {
        downloadedSize += bytes;
        updateProgress(0, url.pathname);
      };

      let download;

      try {
        download = await this.handleDownload(
          entry,
          this.rootDir,
          agent,
          onHeaders,
          onProgress,
        );
      } catch (error) {
        progress.interrupt(`Error when handling download for entry: ${error}; url: ${entry.url}`);
        await sleep(this.delay);
        return;
      }

      if (entry.onDownloaded) {
        try {
          await entry.onDownloaded(download);
        } catch (error) {
          progress.interrupt(`Error when executing download callback for entry: ${error}; url: ${entry.url}`);
          await sleep(this.delay);
          return;
        }
      }

      updateProgress(1, url.pathname);

      if (shutdown.shuttingDown) {
        return;
      }

      if (!download.alreadyDownloaded && this.delay > 0) {
        await sleep(this.delay);
      }
    };

    const promises = entries.map((entry) => limiter(() => downloadEntry(entry)));
    await Promise.allSettled(promises);

    agent.destroy();
  }
}

export default DownloadQueue;
