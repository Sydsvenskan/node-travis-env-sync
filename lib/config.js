// @ts-check
/// <reference types="node" />

'use strict';

const isPlainObject = require('is-plain-obj');

const { deepClone } = require('@hdsydsvenskan/utils');

/**
 * @typedef BaseConfig
 * @property {string[]} [plugins]
 * @property {string[]} [extends]
 */

/**
 * @typedef ResolvedConfigExtras
 * @property {string} baseDir
 */

/** @typedef {BaseConfig & ResolvedConfigExtras} ResolvedConfig */

/**
 * @typedef ResolvedTargetConfigExtras
 * @property {ResolvedConfig} [config]
 */

/**
 * @typedef TargetConfig
 * @property {string[]} repos
 * @property {string} [name]
 * @property {BaseConfig} [config]
 */

/** @typedef {TargetConfig & ResolvedTargetConfigExtras} ResolvedTargetConfig */

/**
 * @typedef TopConfigExtras
 * @property {TargetConfig | TargetConfig[]} target
 */

/** @typedef {ResolvedConfig & TopConfigExtras} EnvSyncConfig */

/**
 * @param {TargetConfig} targetConfig
 * @param {EnvSyncConfig} baseConfig
 * @returns {ResolvedTargetConfig}
 */
const mergeTargetAndBaseConfig = (targetConfig, { baseDir, plugins = [] }) => {
  if (!isPlainObject(targetConfig)) throw new TypeError('Expected target config to be a plain object');

  /** @type {ResolvedTargetConfig} */
  // @ts-ignore
  const mergedConfig = deepClone(targetConfig);

  if (!mergedConfig.config) {
    mergedConfig.config = { baseDir, plugins };
  } else {
    Object.assign(mergedConfig.config, {
      baseDir,
      plugins: [
        ...plugins,
        ...(targetConfig.config.plugins || [])
      ]
    });
  }

  return mergedConfig;
};

module.exports = {
  mergeTargetAndBaseConfig
};
