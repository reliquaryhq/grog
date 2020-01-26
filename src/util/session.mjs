import fs from 'fs-extra';
import path from 'path';
import Session from '../core/Session.mjs';
import { env } from './process.mjs';

const loadSession = async () => {
  const rootDir = env.GROG_COMPOSE_DIR;
  const sessionPath = path.resolve(rootDir, 'session.json');

  if (await fs.pathExists(sessionPath)) {
    const sessionData = await fs.readFile(sessionPath);

    const session = new Session();
    await session.initializeFromJson(sessionData);

    if (session.check()) {
      return session;
    }

    await fs.unlink(sessionPath);
  }

  return null;
};

const saveSession = async (session) => {
  const rootDir = env.GROG_COMPOSE_DIR;
  const sessionPath = path.resolve(rootDir, 'session.json');

  await fs.writeFile(sessionPath, session.toJson());
};

export {
  loadSession,
  saveSession,
};
