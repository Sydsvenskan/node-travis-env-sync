#!/usr/bin/env node

'use strict';

// @ts-check
/// <reference types="node" />

/** @typedef {import('./lib/types').EnvData} EnvData */

const { resolve: pathResolve } = require('path');

const cosmiconfig = require('cosmiconfig');
const debug = require('debug')('envsync');
const inquirer = require('inquirer');
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
    base: {
      plugins
    },
    targets,
    secrets
  } = await initEnvSync(config);

  debug('Sync setup initiated');

  /** @type {EnvData} */
  const secretNames = Object.keys(secrets);
  const resolvedSecrets = {};
  const resolvedEnv = {};

  if (secretNames.length) {
    const secretStores = plugins.filter(plugin => !!plugin.secretStore);
    const secretPrompts = [];

    debug('Resolving %d secrets', secretNames.length);

    // TODO: Ask for description of secret
    // TODO: Ask for secret value
    // TODO: Validate secret value
    // TODO: Add a keychain store
    for (const secret of secretNames) {
      let result;

      for (const store of secretStores) {
        result = store.secretStore.get(secret);

        if (result !== undefined) {
          debug('Found secret: %s', secret);
          resolvedSecrets[secret] = result;
          break;
        }
      }

      if (!result) {
        debug('Did not find secret: %s', secret);
        secretPrompts.push({
          type: 'password',
          message: secrets[secret].provider.secretProviders[secret],
          name: secret
        });
      }
    }

    debug('%d secrets resolved', Object.keys(resolvedSecrets).length);

    if (secretPrompts.length) {
      debug('Asking user about %d secrets', Object.keys(secretPrompts).length);

      const userSecrets = await inquirer.prompt(secretPrompts);

      for (const secretName in userSecrets) {
        if (!userSecrets[secretName]) {
          console.log('😗', secretName);
          delete userSecrets[secretName];
        }
      }

      Object.assign(resolvedSecrets, userSecrets);
    }

    debug('Used secrets: %s', Object.keys(resolvedSecrets).join(', '));
    // FIXME: For any missing secret: Ask for the user to provide it and then store it if possible (unless an option specified that we should ask no such questions and/or store no such answers)

    // FIXME: If any of the unresolved secrets were required secrets: Fail in runEnvSync (it should be done for all implementations, not just the CLI implementation)
    // TODO: Maybe implement the secret store outside of the CLI? Useful elsewhere?

    resolvedEnv.secrets = resolvedSecrets;
  }

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
  process.exit(1);
});
