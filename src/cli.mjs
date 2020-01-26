import { handleAuth } from './cli/auth.mjs';
import { handleCompose } from './cli/compose.mjs';
import { handleInit } from './cli/init.mjs';
import { handleMirror } from './cli/mirror.mjs';
import { handleRead } from './cli/read.mjs';

const handleCommand = async ([command, ...args], flags) => {
  switch (command) {
    case 'auth': {
      return handleAuth(args, flags);
    }

    case 'compose': {
      return handleCompose(args, flags);
    }

    case 'init': {
      return handleInit(args, flags);
    }

    case 'mirror': {
      return handleMirror(args, flags);
    }

    case 'read': {
      return handleRead(args, flags);
    }

    default: {
      throw new Error(`Unknown command: ${command}`);
    }
  }
};

export {
  handleCommand,
};
