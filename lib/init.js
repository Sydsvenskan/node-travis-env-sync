// @ts-check
/// <reference types="node" />

'use strict';

const { importPluginsFrom } = require('./utils/import-plugin');
const { resolvePluginsInOrder } = require('./utils/resolve-plugins');
const { resolveTargetConfig } = require('./config');
const { resolveNeededSecrets } = require('./secrets');

/** @typedef {import('./config').ResolvedTargetConfig} ResolvedTargetConfig */
/** @typedef {import('./config').EnvSyncConfig} EnvSyncConfig */
/** @typedef {import('./types').EnvData} EnvData */
/** @typedef {import('./types').EnvSyncPluginDefinition} EnvSyncPluginDefinition */
/** @typedef {import('./types').EnvSyncTarget} EnvSyncTarget */
/** @typedef {import('./types').EnvSyncStatusCallback} EnvSyncStatusCallback */

/**
 * @typedef EnvSyncSetup
 * @property {EnvSyncTarget[]} targets
 * @property {{[secret: string]: EnvSyncPluginDefinition}} secrets
 */

/**
 * @param {ResolvedTargetConfig} targetConfig
 * @returns {Promise<EnvSyncTarget>}
 */
const initEnvSyncTarget = async function (targetConfig) {
  const {
    baseDir,
    plugins
  } = targetConfig.config;

  const pluginLoader = importPluginsFrom(baseDir, { prefix: 'envsync-plugin-' });

  /** @type {EnvSyncPluginDefinition[]} */
  const resolvedPlugins = plugins ? await resolvePluginsInOrder(plugins, pluginLoader) : [];

  const neededSecrets = resolveNeededSecrets(resolvedPlugins);

  return {
    ...targetConfig,
    plugins: resolvedPlugins,
    secrets: neededSecrets
  };
};

/**
 * @param {EnvSyncConfig} config
 * @returns {Promise<EnvSyncSetup>}
 */
const initEnvSync = async function (config) {
  if (typeof config !== 'object') throw new TypeError('Expected config to be an object');

  const {
    target
  } = config;

  const targetGroups = Array.isArray(target) ? target : [target];

  const groups = await Promise.all(
    targetGroups.map(
      targetConfig =>
        initEnvSyncTarget(resolveTargetConfig(targetConfig, config))
    )
  );

  const secrets = groups.reduce(
    (result, group) => Object.assign(result, group.secrets),
    {}
  );

  return {
    targets: groups,
    secrets
  };
};

module.exports = {
  initEnvSync
};
