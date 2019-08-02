// @ts-check
/// <reference types="node" />

'use strict';

const { importPluginsFrom } = require('./lib/utils/import-plugin');
const { resolvePluginsInOrder } = require('./lib/utils/resolve-plugins');
const { resolveTargetConfig } = require('./lib/config');
const { resolveNeededSecrets } = require('./lib/secrets');

/** @typedef {import('./lib/config').ResolvedTargetConfig} ResolvedTargetConfig */
/** @typedef {import('./lib/config').EnvSyncConfig} EnvSyncConfig */
/** @typedef {import('./lib/types').EnvSyncPluginDefinition} EnvSyncPluginDefinition */

/**
 * @typedef EnvSyncTargetExtras
 * @property {EnvSyncPluginDefinition[]} plugins
 * @property {{[secret: string]: EnvSyncPluginDefinition}} secrets
 */

/** @typedef {ResolvedTargetConfig & EnvSyncTargetExtras} EnvSyncTarget */

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

/**
 * @param {EnvSyncTarget} target
 * @param {Object<string,any>} [envData]
 * @param {{ statusCallback?: (step, plugin, message) => void }} [options]
 */
const doEnvSync = async function (target, envData = {}, { statusCallback }) {
  console.log('🤔', target, envData);
};

module.exports = {
  initEnvSync,
  doEnvSync
};
