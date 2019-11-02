import { handleCompose } from './cli/compose.mjs';
import { handleInit } from './cli/init.mjs';
import { handleMirror } from './cli/mirror.mjs';

const handleCommand = async ([command, ...args], flags) => {
  switch (command) {
    case 'compose': {
      return handleCompose(args, flags);
    }

    case 'init': {
      return handleInit(args, flags);
    }

    case 'mirror': {
      return handleMirror(args, flags);
    }

    default: {
      throw new Error(`Unknown command: ${command}`);
    }
  }
};

export {
  handleCommand,
};
