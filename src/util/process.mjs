import dotenv from 'dotenv';
import childProcess from 'child_process';

const config = dotenv.config();
const env = config.parsed ? config.parsed : {};

const shutdown = {
  shuttingDown: false,
};

const exec = (command, options = {}) => {
  return new Promise((resolve, reject) => {
    childProcess.exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

const receiveShutdown = () => {
  if (!shutdown.shuttingDown) {
    shutdown.shuttingDown = true;

    setTimeout(() => {
      process.exit(0);
    }, 5000);
  }
};

export {
  env,
  exec,
  receiveShutdown,
  shutdown,
};
