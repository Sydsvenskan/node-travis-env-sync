// @ts-check
/// <reference types="node" />

'use strict';

const isPlainObject = require('is-plain-obj');

const { deepClone } = require('@hdsydsvenskan/utils');

/**
 * @typedef BaseConfig
 * @property {string[]} [plugins]
 * @property {string[]} [extends]
 * @property {{ [pluginName: string]: any }} [settings]
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

// TODO: Could we possibly refactor this so that the config is set directly on the target and not as a "config" property of the target?
/**
 * @typedef TargetConfig
 * @property {string[]} [repos]
 * @property {string} [name]
 * @property {BaseConfig} [config]
 */

/** @typedef {TargetConfig & ResolvedTargetConfigExtras} ResolvedTargetConfig */

/**
 * @typedef TopConfigExtras
 * @property {TargetConfig | TargetConfig[]} [target]
 */

/** @typedef {ResolvedConfig & TopConfigExtras} EnvSyncConfig */

/**
 * @template {any} T
 * @param {T[]} value
 * @returns {T[]}
 */
const getUniqueKeys = value => [...new Set(value)];

/**
 * @param {Object<string,any>[]} objects
 * @returns {Object<string,any[]>}
 */
const losslessShallowMergeWithClone = (...objects) => {
  /** @type {string[]} */
  let rawKeys = [];

  objects = objects.filter(item => item !== undefined);

  for (const obj of objects) {
    rawKeys = rawKeys.concat(Object.keys(obj));
  }

  /** @type {Object<string,any[]>} */
  const result = {};

  for (const key of getUniqueKeys(rawKeys)) {
    const value = [];

    for (const obj of objects) {
      if (obj[key] && typeof obj[key] === 'object') {
        value.push(deepClone(obj[key]));
      } else if (obj[key] !== undefined) {
        value.push(obj[key]);
      }
    }

    result[key] = value;
  }

  return result;
};

/**
 * @param {TargetConfig} targetConfig
 * @param {EnvSyncConfig} baseConfig
 * @returns {ResolvedTargetConfig}
 */
const mergeTargetAndBaseConfig = (targetConfig, baseConfig) => {
  if (!isPlainObject(targetConfig)) throw new TypeError('Expected target config to be a plain object');
  if (!isPlainObject(baseConfig)) throw new TypeError('Expected base config to be a plain object');

  const { baseDir, plugins = [], settings } = baseConfig;

  /** @type {ResolvedTargetConfig} */
  // @ts-ignore
  const mergedConfig = deepClone(targetConfig);

  mergedConfig.config = Object.assign(mergedConfig.config || {}, {
    baseDir,
    plugins: [
      ...plugins,
      ...((mergedConfig.config || {}).plugins || [])
    ],
    settings: losslessShallowMergeWithClone(settings, (mergedConfig.config || {}).settings)
  });

  return mergedConfig;
};

module.exports = {
  mergeTargetAndBaseConfig
};
