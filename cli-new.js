// @ts-check
/// <reference types="node" />

'use strict';

/** @typedef {import('./lib/config').EnvSyncConfig} EnvSyncConfig */
/** @typedef {import('./lib/types').EnvData} EnvData */

const { resolve: pathResolve } = require('path');

const cosmiconfig = require('cosmiconfig');
const debug = require('debug')('envsync');
const meow = require('meow');

const resolveCliSecrets = require('./lib/cli/secrets');

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

  /** @type {EnvSyncConfig} */
  const config = Object.assign({}, foundConfig.config, { baseDir });

  debug('Resolved config: %O', config);

  const {
    base: {
      plugins
    },
    targets,
    secrets
  } = await initEnvSync(config);

  debug('Sync setup initiated');

  /** @type {EnvData} */
  const resolvedEnv = {
    secrets: await resolveCliSecrets({ debug, plugins, secrets, config })
  };

  for (const target of targets) {
    await doEnvSync(target, resolvedEnv, {
      statusCallback: (step, message) => {
        debug('Syncing %s target: %s', target.name || 'unnamed', message);
      }
    });
  }

  debug('Syncing complete');
}).catch(err => {
  // eslint-disable-next-line no-console
  console.error('An error occured:', err.stack);
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
});
