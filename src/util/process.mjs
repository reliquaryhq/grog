import process from 'child_process';

const exec = (command, options = {}) => {
  return new Promise((resolve, reject) => {
    process.exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

export {
  exec,
};
