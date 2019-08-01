// @ts-check
/// <reference types="node" />

'use strict';

const Topo = require('@hapi/topo');

/** @typedef {{ plugins?: string[] }} DependencyDefinition */

/**
 * @param {string[]} plugins
 * @param {(pluginName: string) => DependencyDefinition} loadPlugin
 * @param {object} options
 * @param {Set} options.loadedPlugins
 * @param {Set} options.missingPlugins
 * @param {Topo} options.orderedPlugins
 * @returns {void}
 */
const internalResolvePluginTree = function (plugins, loadPlugin, {
  loadedPlugins,
  missingPlugins,
  orderedPlugins
}) {
  for (const pluginName of plugins) {
    if (loadedPlugins.has(pluginName)) {
      continue;
    }

    loadedPlugins.add(pluginName);

    const pluginDefinition = loadPlugin(pluginName);

    if (!pluginDefinition) {
      missingPlugins.add(pluginName);
      continue;
    }

    const dependencies = pluginDefinition.plugins || [];

    orderedPlugins.add(pluginDefinition, {
      after: dependencies,
      group: pluginName
    });

    internalResolvePluginTree(dependencies, loadPlugin, {
      loadedPlugins,
      missingPlugins,
      orderedPlugins
    });
  }
};

/**
 * @param {string[]} plugins
 * @param {(pluginName: string) => DependencyDefinition} loadPlugin
 * @returns {Object<string,any>[]}
 */
const resolvePluginTree = function (plugins, loadPlugin) {
  if (!Array.isArray(plugins)) throw new TypeError('Expected plugins to be an array of strings');
  if (typeof loadPlugin !== 'function') throw new TypeError('Expected loadPlugin to be a function');

  const loadedPlugins = new Set();
  const missingPlugins = new Set();
  const orderedPlugins = new Topo();

  internalResolvePluginTree(plugins, loadPlugin, {
    loadedPlugins,
    missingPlugins,
    orderedPlugins
  });

  if (missingPlugins.size > 0) {
    const values = [...missingPlugins];
    throw new Error(`Plugin${values.length > 1 ? 's' : ''} missing: "${values.join('", "')}"`);
  }

  return orderedPlugins.nodes;
};

module.exports = { resolvePluginTree };
