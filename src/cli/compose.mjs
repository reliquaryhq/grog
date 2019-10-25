import { ensureInit } from '../util/common.mjs';
import { MODULE_DIR } from '../util/fs.mjs';
import { exec } from '../util/process.mjs';

const handleComposeDown = async (_args, _flags) => {
  const result = await exec(`docker-compose -p grog -f ${MODULE_DIR}/docker-compose.yml down`);
  console.log(result.stdout);
};

const handleComposePs = async (_args, _flags) => {
  const result = await exec(`docker-compose -p grog -f ${MODULE_DIR}/docker-compose.yml ps`);
  console.log(result.stdout);
};

const handleComposeUp = async (_args, _flags) => {
  const result = await exec(`docker-compose -p grog -f ${MODULE_DIR}/docker-compose.yml up -d`);
  console.log(result.stdout);
};

const handleCompose = async ([command, ...args], flags) => {
  await ensureInit();

  switch (command) {
    case 'down': {
      return handleComposeDown(args, flags);
    }

    case 'ps': {
      return handleComposePs(args, flags);
    }

    case 'up': {
      return handleComposeUp(args, flags);
    }
  }
};

export {
  handleCompose,
};
