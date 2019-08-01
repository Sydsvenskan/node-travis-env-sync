// @ts-check
/// <reference types="node" />

'use strict';

const Topo = require('@hapi/topo');
const VError = require('verror');

/**
 * @typedef PluginDefinition
 * @property {string} name
 * @property {string[]} [dependencies]
 * @property {any} plugin
 */

/**
 * @param {string[]} plugins
 * @param {(pluginName: string) => PluginDefinition} loadPlugin
 * @param {object} options
 * @param {Set} options.loadedPlugins
 * @param {Set} options.missingPlugins
 * @param {Topo} options.orderedPlugins
 * @param {boolean} options.allowOptionalDependencies
 * @returns {Promise<void>}
 */
const internalResolvePluginTree = async function (plugins, loadPlugin, {
  loadedPlugins,
  missingPlugins,
  orderedPlugins,
  allowOptionalDependencies
}) {
  for (let pluginName of plugins) {
    const optionalDependency = allowOptionalDependencies && pluginName.endsWith('?');

    if (optionalDependency) {
      pluginName = pluginName.slice(0, -1);
    }

    if (loadedPlugins.has(pluginName)) {
      continue;
    }

    loadedPlugins.add(pluginName);

    let pluginDefinition;

    try {
      pluginDefinition = await loadPlugin(pluginName);
    } catch (err) {
      throw new VError(err, `Failed to load plugin "${pluginName}"`);
    }

    if (!pluginDefinition) {
      if (optionalDependency && allowOptionalDependencies) {
        orderedPlugins.add(false, { group: pluginName });
      } else {
        missingPlugins.add(pluginName);
      }

      continue;
    }

    const dependencies = pluginDefinition.dependencies || [];

    try {
      orderedPlugins.add(pluginDefinition, {
        after: dependencies,
        group: pluginName
      });
    } catch (err) {
      throw new VError(err, `Failed to add plugin "${pluginName}"`);
    }

    await internalResolvePluginTree(dependencies, loadPlugin, {
      loadedPlugins,
      missingPlugins,
      orderedPlugins,
      allowOptionalDependencies
    });
  }
};

/**
 * @param {string[]} plugins
 * @param {(pluginName: string) => PluginDefinition} [loadPlugin]
 * @param {{ allowOptionalDependencies?: boolean }} options
 * @returns {Promise<PluginDefinition[]>}
 */
const resolvePluginTree = async function (plugins, loadPlugin, { allowOptionalDependencies = true } = {}) {
  if (!Array.isArray(plugins)) throw new TypeError('Expected plugins to be an array of strings');
  if (typeof loadPlugin !== 'function') throw new TypeError('Expected loadPlugin to be a function');

  const loadedPlugins = new Set();
  const missingPlugins = new Set();
  const orderedPlugins = new Topo();

  await internalResolvePluginTree(plugins, loadPlugin, {
    loadedPlugins,
    missingPlugins,
    orderedPlugins,
    allowOptionalDependencies
  });

  if (missingPlugins.size > 0) {
    const values = [...missingPlugins];
    throw new Error(`Plugin${values.length > 1 ? 's' : ''} missing: "${values.join('", "')}"`);
  }

  return orderedPlugins.nodes;
};

module.exports = {
  resolvePluginTree
};
