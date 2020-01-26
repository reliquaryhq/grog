import Session from '../core/Session.mjs';
import { loadSession, saveSession } from '../util/session.mjs';

const handleAuthSession = async (_args, flags) => {
  const url = flags['url'];

  if (await loadSession()) {
    console.log('Using existing session...');
    return;
  }

  console.log('Authenticating new session from redirect URL...');

  const session = new Session();
  await session.initializeFromUrl(url);

  console.log(`Authenticated as ${session.userId}; expires at ${session.expiresAt}`);

  await saveSession(session);
};

const handleAuth = async ([command, ...args], flags) => {
  switch (command) {
    case 'session': {
      return handleAuthSession(args, flags);
    }

    default: {
      throw new Error(`Unsupported command: ${command}`);
    }
  }
};

export {
  handleAuth,
};
