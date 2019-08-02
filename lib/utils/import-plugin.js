// @ts-check
/// <reference types="node" />

'use strict';

const { normalize: pathNormalize } = require('path');

const importFrom = require('import-from');

/**
 * @typedef PluginNameOptions
 * @property {string} [prefix]
 */

/**
 * @param {string} pluginName
 * @param {PluginNameOptions} [options]
 * @returns {string}
 * @throws {Error}
 */
const normalizePluginName = (pluginName, { prefix } = {}) => {
  if (typeof pluginName !== 'string') throw new TypeError('Invalid pluginName, expected a non-empty string');

  const normalizedPath = pathNormalize(pluginName);

  if (normalizedPath.startsWith('..')) {
    throw new Error(`Plugin name attempts directory traversal: "${pluginName}"`);
  }

  if (pluginName.startsWith('.')) {
    return './' + normalizedPath;
  }

  if (!prefix || normalizedPath.startsWith(prefix)) {
    return pluginName;
  }

  return prefix + pluginName;
};

// TODO: Add tests
/**
 * @param {string} baseDir
 * @param {PluginNameOptions} [options]
 * @returns {(pluginName: string) => any}
 */
const importPluginsFrom = (baseDir, options = {}) => {
  if (typeof baseDir !== 'string') throw new TypeError('Invalid baseDir, expected a non-empty string');

  /**
   * @param {string} pluginName
   * @returns {any}
   */
  return (pluginName) => {
    // Uses module.exports.normalizePluginName() to enable eg. stubbing in tests
    const normalizedPluginName = module.exports.normalizePluginName(pluginName, options);
    return importFrom.silent(baseDir, normalizedPluginName);
  };
};

module.exports = {
  normalizePluginName,
  importPluginsFrom
};
