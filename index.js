// @ts-check
/// <reference types="node" />

'use strict';

const { resolvePluginTree } = require('./lib/utils/resolve-plugins');

const validPluginName = /[a-z][a-z0-9-]*/;

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
 * @property {TargetConfig | TargetConfig[]} targets
 */

/** @typedef {BaseConfig & TopConfigExtras} EnvSyncConfig */

/**
 * @param {EnvSyncConfig} config
 */
const envSync = function (config) {
  const {
    plugins
  } = config;

  const resolvedPlugins = resolvePluginTree(plugins);
}

module.exports = envSync;
