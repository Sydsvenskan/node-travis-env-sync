// @ts-check
/// <reference types="node" />

'use strict';

const { importPluginsFrom } = require('./utils/import-plugin');
const { resolvePluginsInOrder } = require('./utils/resolve-plugins');
const { mergeTargetAndBaseConfig } = require('./config');
const { resolveNeededSecrets } = require('./secrets');

/** @typedef {import('./config').ResolvedConfig} ResolvedConfig */
/** @typedef {import('./config').ResolvedTargetConfig} ResolvedTargetConfig */
/** @typedef {import('./config').EnvSyncConfig} EnvSyncConfig */
/** @typedef {import('./types').EnvData} EnvData */
/** @typedef {import('./types').EnvSyncBase} EnvSyncBase */
/** @typedef {import('./types').EnvSyncPluginDefinition} EnvSyncPluginDefinition */
/** @typedef {import('./types').EnvSyncTarget} EnvSyncTarget */
/** @typedef {import('./types').EnvSyncStatusCallback} EnvSyncStatusCallback */

/**
 * @typedef EnvSyncSetup
 * @property {EnvSyncBase} base
 * @property {EnvSyncTarget[]} targets
 * @property {{[secret: string]: EnvSyncPluginDefinition}} secrets
 */

/**
 * @param {ResolvedConfig} config
 * @returns {Promise<EnvSyncBase>}
 */
const initEnvSyncPart = async function ({
  baseDir,
  plugins
}) {
  // TODO: Add a weight option for sorting plugins who are otherwise at same weight
  const pluginLoader = importPluginsFrom(baseDir, { prefix: 'envsync-plugin-' });

  /** @type {EnvSyncPluginDefinition[]} */
  const resolvedPlugins = plugins ? await resolvePluginsInOrder(plugins, pluginLoader) : [];

  const neededSecrets = resolveNeededSecrets(resolvedPlugins);

  return {
    plugins: resolvedPlugins,
    secrets: neededSecrets
  };
};

/**
 * @param {ResolvedTargetConfig} targetConfig
 * @returns {Promise<EnvSyncTarget>}
 */
const initEnvSyncTarget = async (targetConfig) => ({
  ...targetConfig,
  ...await initEnvSyncPart(targetConfig.config)
});

/**
 * @param {EnvSyncConfig} config
 * @returns {Promise<EnvSyncBase>}
 */
const initEnvSyncBase = async (config) => ({
  ...await initEnvSyncPart(config)
});

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
        initEnvSyncTarget(mergeTargetAndBaseConfig(targetConfig, config))
    )
  );

  const secrets = groups.reduce(
    (result, group) => Object.assign(result, group.secrets),
    {}
  );

  const base = await initEnvSyncBase(config);

  return {
    base,
    targets: groups,
    secrets
  };
};

module.exports = {
  initEnvSync
};
