// @ts-check
/// <reference types="node" />

'use strict';

const flatMap = require('array.prototype.flatmap');

const { importPluginsFrom } = require('./lib/utils/import-plugin');
const { resolvePluginOrder } = require('./lib/utils/resolve-plugins');

/** @typedef {import('./lib/utils/resolve-plugins').PluginDefinition} PluginDefinition */

/**
 * @typedef BaseConfig
 * @property {string[]} plugins
 * @property {string[]} extends
 */

/**
 * @typedef TargetConfig
 * @property {string[]} repos
 * @property {string} [name]
 * @property {BaseConfig} [config]
 */

/**
 * @typedef TopConfigExtras
 * @property {string} baseDir
 * @property {TargetConfig | TargetConfig[]} targets
 */

/** @typedef {BaseConfig & TopConfigExtras} EnvSyncConfig */

/**
 * @param {EnvSyncConfig} config
 */
const envSync = function (config) {
  const {
    baseDir,
    plugins
  } = config;

  const pluginLoader = importPluginsFrom(baseDir, { prefix: 'envsync-plugin-' });
  // FIXME: This should run once for every target group
  const resolvedPlugins = resolvePluginOrder(plugins, pluginLoader);

  // TODO: Check that all used secrets have a secret provider + check that not two plugins provide the same secret
  const secrets = flatMap(resolvedPlugins, plugin => plugin.secrets || []);
  const secretProviders = flatMap(resolvedPlugins, plugin => Object.keys(plugin.secretProvider || {}));

  console.log('🙂', resolvedPlugins, secrets, secretProviders);
};

module.exports = envSync;
