// @ts-check
/// <reference types="node" />

'use strict';

// FIXME: Add tests for this file?

const flatMap = require('array.prototype.flatmap');

/** @typedef {import('./types').EnvSyncPluginDefinition} EnvSyncPluginDefinition */
/** @typedef {import('./types').EnvSyncSecret} EnvSyncSecret */

/**
 * @param {any[]|Iterable<any>} arr1
 * @param {any[]|Iterable<any>} arr2
 * @returns {any[]}
 */
const diffArray = (arr1, arr2) => {
  const result = [];
  const arr2resolved = Array.isArray(arr2) ? arr2 : [...arr2];

  for (const value of arr1) {
    if (!arr2resolved.includes(value)) {
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
      secretName => `"${secretName}" (provided by "${duplicateProviders[secretName].map(plugin => plugin.name || 'unnamed').join('", "')}")`
    );
    throw new Error(`Duplicate secret providers for: ${humanReadableList.join(', ')}`);
  }

  return secretProviders;
};

/**
 * @param {EnvSyncPluginDefinition[]} plugins
 * @returns {{ [secret: string]: EnvSyncSecret }}
 * @throws {Error}
 */
const resolveNeededSecrets = (plugins) => {
  /** @type {(string|undefined)[]} */
  const secrets = flatMap(plugins, plugin => (plugin.secrets || []));

  if (secrets.length === 0) return {};

  /** @type {Set<string>} */
  const requiredSecrets = new Set();
  /** @type {Set<string>} */
  const secretSet = new Set();

  for (const secretName of secrets) {
    if (!secretName) continue;

    if (secretName.endsWith('?')) {
      const suffixLessSecretName = secretName.slice(0, -1);
      secretSet.add(suffixLessSecretName);
    } else {
      secretSet.add(secretName);
      requiredSecrets.add(secretName);
    }
  }

  const secretProviders = resolveSecretProviders(plugins);
  const missingSecretProviders = diffArray(requiredSecrets, Object.keys(secretProviders));

  if (missingSecretProviders.length) {
    throw new Error(`Missing secret providers for required secrets: "${missingSecretProviders.join('", "')}"`);
  }

  if (secretSet.size === 0) return {};

  /** @type {{ [secretName: string]: EnvSyncSecret }} */
  const result = {};

  for (const secretName of secretSet) {
    // TODO:; Add tests for this if-case
    if (!secretProviders[secretName]) continue;

    result[secretName] = {
      required: requiredSecrets.has(secretName),
      provider: secretProviders[secretName]
    };
  }

  return result;
};

module.exports = {
  resolveNeededSecrets
};
