import dotenv from 'dotenv';
import childProcess from 'child_process';

const config = dotenv.config();
const env = config.parsed ? config.parsed : {};

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

export {
  env,
  exec,
};
