import fs from 'fs-extra';

const ensureInit = async () => {
  if (!(await fs.pathExists('.env'))) {
    throw new Error('grog not inited: missing .env');
  }
};

export {
  ensureInit,
};
