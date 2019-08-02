// @ts-check
/// <reference types="node" />

'use strict';

const flatMap = require('array.prototype.flatmap');

/** @typedef {import('./types').EnvSyncPluginDefinition} EnvSyncPluginDefinition */

/**
 * @param {any[]} arr1
 * @param {any[]} arr2
 * @returns {any[]}
 */
const diffArray = (arr1, arr2) => {
  const result = [];

  for (const value of arr1) {
    if (!arr2.includes(value)) {
      result.push(value);
    }
  }

  return result;
};

// TODO: Maybe only resolve needed secret providers and ignore any duplicate ones that are not needed?
/**
 * @param {EnvSyncPluginDefinition[]} plugins
 * @returns {{ [secret: string]: EnvSyncPluginDefinition }}
 * @throws {Error}
 */
const resolveSecretProviders = (plugins) => {
  /** @type {{ [secret: string]: EnvSyncPluginDefinition[] }} */
  const duplicateProviders = {};
  /** @type {{ [secret: string]: EnvSyncPluginDefinition }} */
  const secretProviders = {};

  for (const plugin of plugins) {
    if (!plugin.secretProviders) {
      continue;
    }
    for (const secretName in plugin.secretProviders) {
      if (secretProviders[secretName]) {
        if (!duplicateProviders[secretName]) {
          duplicateProviders[secretName] = [secretProviders[secretName]];
        }
        duplicateProviders[secretName].push(plugin);
      } else {
        secretProviders[secretName] = plugin;
      }
    }
  }

  const duplicateProviderNames = Object.keys(duplicateProviders);

  if (duplicateProviderNames.length) {
    const humanReadableList = duplicateProviderNames.map(
      secretName => `"${secretName}" (provided by "${duplicateProviders[secretName].map(plugin => plugin.name).join('", "')}")`
    );
    throw new Error(`Duplicate secret providers for: ${humanReadableList.join(', ')}`);
  }

  return secretProviders;
};

/**
 * @param {EnvSyncPluginDefinition[]} plugins
 * @returns {{ [secret: string]: EnvSyncPluginDefinition }}
 * @throws {Error}
 */
const resolveNeededSecrets = (plugins) => {
  const secretProviders = resolveSecretProviders(plugins);
  const secrets = flatMap(plugins, plugin => plugin.secrets || []);

  const missingSecretProviders = diffArray(secrets, Object.keys(secretProviders));

  if (missingSecretProviders.length) {
    throw new Error(`Missing secret providers for: "${missingSecretProviders.join('", "')}"`);
  }

  return secrets.reduce((result, secretName) => {
    result[secretName] = secretProviders[secretName];
    return result;
  }, {});
};

module.exports = {
  resolveNeededSecrets
};
