// @ts-check
/// <reference types="node" />

'use strict';

const flatMap = require('array.prototype.flatmap');

const { deepClone } = require('@hdsydsvenskan/utils');

const { importPluginsFrom } = require('./lib/utils/import-plugin');
const { resolvePluginOrder } = require('./lib/utils/resolve-plugins');

/** @typedef {import('./lib/utils/resolve-plugins').PluginDefinition} PluginDefinition */

/**
 * @typedef BaseConfig
 * @property {string[]} [plugins]
 * @property {string[]} [extends]
 */

/**
 * @typedef TargetConfig
 * @property {string[]} repos
 * @property {string} [name]
 * @property {BaseConfig} [config]
 */

/**
 * @typedef FullConfigExtras
 * @property {string} baseDir
 */

/**
 * @typedef FullTargetConfigExtras
 * @property {BaseConfig & FullConfigExtras} [config]
 */

/** @typedef {TargetConfig & FullTargetConfigExtras} FullTargetConfig */

/**
 * @typedef TopConfigExtras
 * @property {TargetConfig | TargetConfig[]} target
 */

/** @typedef {BaseConfig & TopConfigExtras & FullConfigExtras} EnvSyncConfig */

/**
 * @param {TargetConfig} targetConfig
 * @param {EnvSyncConfig} mainConfig
 * @returns {FullTargetConfig}
 */
const resolveTargetConfig = (targetConfig, { baseDir, plugins }) => {
  /** @type {FullTargetConfig} */
  // @ts-ignore
  const mergedConfig = deepClone(targetConfig);

  if (!mergedConfig.config) {
    mergedConfig.config = { baseDir, plugins };
  } else {
    Object.assign(mergedConfig.config, {
      baseDir,
      plugins: [
        ...(plugins || []),
        ...(targetConfig.config.plugins || [])
      ]
    });
  }

  return mergedConfig;
};

/**
 * @param {FullTargetConfig} targetConfig
 */
const envSyncTarget = async function (targetConfig) {
  const {
    baseDir,
    plugins
  } = targetConfig.config;

  const pluginLoader = importPluginsFrom(baseDir, { prefix: 'envsync-plugin-' });
  const resolvedPlugins = await resolvePluginOrder(plugins, pluginLoader);

  // TODO: Check that all used secrets have a secret provider + check that not two plugins provide the same secret
  const secrets = flatMap(resolvedPlugins, plugin => plugin.secrets || []);
  const secretProviders = flatMap(resolvedPlugins, plugin => Object.keys(plugin.secretProvider || {}));

  console.log('🙂', resolvedPlugins, secrets, secretProviders);
};

/**
 * @param {EnvSyncConfig} config
 */
const envSync = async function (config) {
  const {
    target
  } = config;

  const targetGroups = Array.isArray(target) ? target : [target];

  await Promise.all(
    targetGroups.map(
      targetConfig =>
        envSyncTarget(resolveTargetConfig(targetConfig, config))
    )
  );
};

module.exports = envSync;
