const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const bytesString = parseFloat((bytes / Math.pow(k, i)).toFixed(dm)).toString();
  return `${bytesString}${bytesString.includes('.') ? '' : '.0'} ${sizes[i]}`;
};

const formatFixedWidthString = (string, width, align = 'left') => {
  if (string.length <= width) {
    return align === 'left'
      ? string.padEnd(width, ' ')
      : string.padStart(width, ' ');
  }

  return align === 'left'
    ? `${string.substring(0, width - 3)}...`
    : `...${string.substring(string.length - width + 3)}`;
};

const formatPath22 = (path) =>
  `${path.slice(0, 2)}/${path.slice(2, 4)}/${path}`;

export {
  formatBytes,
  formatFixedWidthString,
  formatPath22,
};
