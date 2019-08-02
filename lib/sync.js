// @ts-check
/// <reference types="node" />

'use strict';

/** @typedef {import('./types').EnvData} EnvData */
/** @typedef {import('./types').EnvSyncTarget} EnvSyncTarget */
/** @typedef {import('./types').EnvSyncStatusCallback} EnvSyncStatusCallback */

/**
 * @param {EnvSyncTarget} target
 * @param {EnvData} [envData]
 * @param {object} [options]
 * @param {EnvSyncStatusCallback} [options.statusCallback]
 */
const doEnvSync = async function (target, envData = {}, options = {}) {
  const {
    statusCallback = () => {}
  } = options;

  const repos = target.repos || [];

  await statusCallback('global', `Syncing global environment...`, { count: repos.length });

  for (const plugin of target.plugins) {
    if (plugin.run) {
      await statusCallback('run', `Running ${plugin.name} globally...`, { plugin: plugin.name });

      await plugin.run({ config: target, envData, statusCallback });

      await statusCallback('run-complete', '...complete.', { plugin: plugin.name });
    }
  }

  await statusCallback('global-complete', `...completed syncing of global environment.`);
  await statusCallback('repos', `Syncing ${repos.length} repos...`, { count: repos.length });

  for (const repo of repos) {
    for (const plugin of target.plugins) {
      if (plugin.runOnRepo) {
        await statusCallback('run-on-repo', `Running ${plugin.name} on ${repo}...`, { repo, plugin: plugin.name });

        await plugin.runOnRepo({ config: target, envData, repo, statusCallback });

        await statusCallback('run-on-repo-complete', '...complete.', { repo, plugin: plugin.name });
      }
    }
  }

  await statusCallback('repos-complete', `...completed syncing of repos.`);
};

module.exports = {
  doEnvSync
};
