// @ts-check
/// <reference types="node" />

'use strict';

const PluginSystem = require('@hdsydsvenskan/plugin-system');

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
class EnvSync extends PluginSystem {
  /**
   * @param {EnvSyncConfig} config
   * @returns {void}
   */
  setConfig (config) {
    const {
      plugins
    } = config;

    for (const plugin of plugins) {
      this.addPlugin(plugin);
    }
  }
}

module.exports = envSync;
