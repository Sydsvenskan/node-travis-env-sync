// @ts-check
/// <reference types="node" />

'use strict';

const { importPluginsFrom } = require('./lib/utils/import-plugin');
const { resolvePluginOrder } = require('./lib/utils/resolve-plugins');
const { resolveTargetConfig } = require('./lib/config');
const { resolveNeededSecrets } = require('./lib/secrets');

/** @typedef {import('./lib/config').ResolvedTargetConfig} ResolvedTargetConfig */
/** @typedef {import('./lib/config').EnvSyncConfig} EnvSyncConfig */
/** @typedef {import('./lib/types').EnvSyncPluginDefinition} EnvSyncPluginDefinition */

/**
 * @param {ResolvedTargetConfig} targetConfig
 */
const envSyncTarget = async function (targetConfig) {
  const {
    baseDir,
    plugins
  } = targetConfig.config;

  const pluginLoader = importPluginsFrom(baseDir, { prefix: 'envsync-plugin-' });

  /** @type {EnvSyncPluginDefinition[]} */
  const resolvedPlugins = await resolvePluginOrder(plugins, pluginLoader);

  const neededSecrets = resolveNeededSecrets(resolvedPlugins);

  console.log('🙂', resolvedPlugins, neededSecrets);
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
