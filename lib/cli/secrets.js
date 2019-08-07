// @ts-check
/// <reference types="node" />

'use strict';

/** @typedef {import('../types').EnvData} EnvData */
/** @typedef {import('../types').EnvSyncPluginDefinition} EnvSyncPluginDefinition */
/** @typedef {import('../types').EnvSyncSecret} EnvSyncSecret */

const inquirer = require('inquirer');

/**
 * @param {object} options
 * @param {function} options.debug
 * @param {EnvSyncPluginDefinition[]} options.plugins
 * @param {{[secret: string]: EnvSyncSecret}} options.secrets
 * @returns {Promise<{[secret: string]: string}>}
 */
const resolveCliSecrets = async function ({ debug, plugins, secrets }) {
  const secretNames = Object.keys(secrets);
  /** @type {{[secret: string]: string}} */
  const resolvedSecrets = {};

  if (!secretNames.length) { return {}; }

  const secretStores = plugins.filter(plugin => !!plugin.secretStore);
  const secretPrompts = [];

  debug('Resolving %d secrets', secretNames.length);

  // TODO: Validate secret value
  // TODO: Add a keychain store
  for (const secret of secretNames) {
    let result;

    for (const store of secretStores) {
      result = await store.secretStore.get(secret);

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

  return resolvedSecrets;
};

module.exports = resolveCliSecrets;
