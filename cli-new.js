#!/usr/bin/env node

'use strict';

// @ts-check
/// <reference types="node" />

const { resolve: pathResolve } = require('path');

const cosmiconfig = require('cosmiconfig');
const debug = require('debug')('envsync');
const meow = require('meow');

const {
  initEnvSync,
  doEnvSync
} = require('.');

const cli = meow(`
    Usage
      $ envsync <path>

    Options
      --dry-run,            Runs everything as normal, but doesn't do any changes

    Examples
      $ envsync .
`, {
  flags: {
    'dry-run': {
      type: 'boolean'
    }
  }
});

// const {
//   dryRun
// } = cli.flags;

const baseDir = cli.input[0]
  ? pathResolve(process.cwd(), cli.input[0])
  : process.cwd();

debug('Looking for config in: %s', baseDir);

const explorer = cosmiconfig('envsync', { stopDir: baseDir });

explorer.search(baseDir).then(async foundConfig => {
  if (!foundConfig) {
    throw new Error('Couldn\'t find a config file');
  }

  const config = Object.assign({}, foundConfig.config, { baseDir });

  debug('Resolved config: %O', config);

  const {
    targets,
    secrets
  } = await initEnvSync(config);

  debug('Sync setup initiated');

  const secretNames = Object.keys(secrets);

  if (secretNames) {
    // FIXME: Resolve some secrets!
    console.log('Lets resolve some secrets!');
  }

  debug('Secrets resolved');

  const resolvedEnv = {};

  for (const target of targets) {
    debug('Syncing "%s" target', target.name || 'unnamed');

    doEnvSync(target, resolvedEnv, { statusCallback: (...params) => { console.log('😁', ...params); } });
  }

  debug('Syncing complete');
}).catch(err => {
  // eslint-disable-next-line no-console
  console.error('An error occured:', err.stack);
  process.exit(1);
});
