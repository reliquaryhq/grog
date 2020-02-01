#!/usr/bin/env node --experimental-modules --no-warnings

import minimist from 'minimist';
import { handleCommand } from './cli.mjs';

const STRING_ARGS = [
  'build-id',
];

const argv = minimist(process.argv.slice(2), { string: STRING_ARGS });
const { _: args, ...flags } = argv;

handleCommand(args, flags)
  .then(() => process.exit(0))
  .catch((error) => console.error(error));
