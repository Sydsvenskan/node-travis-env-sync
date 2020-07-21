// @ts-check
/// <reference types="node" />

'use strict';

/** @typedef {import('../config').EnvSyncConfig} EnvSyncConfig */
/** @typedef {import('../types').EnvData} EnvData */
/** @typedef {import('../types').EnvSyncPluginDefinition} EnvSyncPluginDefinition */
/** @typedef {import('../types').EnvSyncSecret} EnvSyncSecret */

const inquirer = require('inquirer');

const { deepClone } = require('@hdsydsvenskan/utils');

/**
 * @param {object} options
 * @param {function} options.debug
 * @param {EnvSyncPluginDefinition[]} options.plugins
 * @param {{[secret: string]: EnvSyncSecret}} options.secrets
 * @param {EnvSyncConfig} options.config
 * @returns {Promise<{[secret: string]: string}>}
 */
const resolveCliSecrets = async function ({ debug, plugins, secrets, config }) {
  const secretNames = Object.keys(secrets);
  /** @type {{[secret: string]: string}} */
  const resolvedSecrets = {};

  if (!secretNames.length) { return {}; }

  const settings = config.settings || {};
  const secretStores = plugins.filter(plugin => !!plugin.secretStore);
  const secretPrompts = [];

  debug('Resolving %d secrets', secretNames.length);

  // TODO: Validate secret value
  // TODO: Add a keychain store
  for (const secret of secretNames) {
    let result;

    for (const store of secretStores) {
      console.log('👓', settings, store.name);
      let pluginSettings = settings[store.name];

      if (settings[store.name] && typeof settings[store.name] === 'object') {
        pluginSettings = deepClone(settings[store.name]);
      }

      result = await store.secretStore.get(secret, pluginSettings);

      if (result !== undefined) {
        debug('Found secret: %s', secret);
        resolvedSecrets[secret] = result;
        break;
      }
    }

    if (!result) {
      debug('Did not find secret: %s', secret);
      // TODO: Enable other kind of prompts, like eg. an OAuth dance
      secretPrompts.push({
        type: 'password',
        // TODO: Add tests / types so that we know that this is actually always fully available
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
        delete userSecrets[secretName];
      }
    }

    // FIXME: Test new secrets
    // FIXME: Save new secrets

    Object.assign(resolvedSecrets, userSecrets);
  }

  /** @type {string[]} */
  const invalidSecrets = [];

  // TODO: Add tests for this
  for (const secret of Object.keys(resolvedSecrets)) {
    const { provider, required } = secrets[secret];
    const testResult = await (
      provider.testSecret
        ? provider.testSecret({
          secretName: secret,
          secretValue: resolvedSecrets[secret]
        })
        : true
    );
    if (testResult === false) {
      if (required) invalidSecrets.push(secret);
      delete resolvedSecrets[secret];
    }
  }

  if (invalidSecrets.length !== 0) {
    throw new Error('Invalid secrets: ' + invalidSecrets.join(', '));
  }

  debug('Used secrets: %s', Object.keys(resolvedSecrets).join(', '));

  return resolvedSecrets;
};

module.exports = resolveCliSecrets;
