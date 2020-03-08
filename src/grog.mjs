#!/usr/bin/env node --experimental-modules --no-warnings

import minimist from 'minimist';
import { handleCommand } from './cli.mjs';
import { receiveShutdown } from './util/process.mjs';

const STRING_ARGS = [
  'build-id',
];

const argv = minimist(process.argv.slice(2), { string: STRING_ARGS });
const { _: args, ...flags } = argv;

process.stdin.resume();

process.on('SIGINT', () => {
  console.log('\nSIGINT received; shutting down...');
  receiveShutdown();
});

process.on('SIGTERM', () => {
  console.log('\nSIGTERM received; shutting down...');
  receiveShutdown();
});

handleCommand(args, flags)
  .then(() => process.exit(0))
  .catch((error) => console.error(error));
