// @ts-check
/// <reference types="node" />

'use strict';

/** @typedef {import('./utils/resolve-plugins').PluginDefinition} PluginDefinition */
/** @typedef {import('./config').ResolvedTargetConfig} ResolvedTargetConfig */

/**
 * @typedef EnvSyncTargetExtras
 * @property {EnvSyncPluginDefinition[]} plugins
 * @property {{[secret: string]: EnvSyncPluginDefinition}} secrets
 */

/** @typedef {ResolvedTargetConfig & EnvSyncTargetExtras} EnvSyncTarget */

/** @typedef {(step: string, message: string, data?: Object<string,any>) => (void|Promise<void>)} EnvSyncStatusCallback */

/**
 * @typedef EnvData
 * @property {{ [secret: string]: any }} [secrets]
 */

/**
 * @typedef EnvSyncPluginRunOptions
 * @property {EnvData} envData
 * @property {EnvSyncTarget} config
 * @property {EnvSyncStatusCallback} statusCallback
 */

/** @typedef {EnvSyncPluginRunOptions & {repo: string}} EnvSyncPluginRunOnRepoOptions */

/**
 * @typedef EnvSyncPluginExtras
 * @property {string} [name]
 * @property {string[]} [secrets]
 * @property {{ [secretName: string]: string }} [secretProviders]
 * @property {(options: EnvSyncPluginRunOptions) => (void|Promise<void>)} [run]
 * @property {(options: EnvSyncPluginRunOnRepoOptions) => (void|Promise<void>)} [runOnRepo]
 */

/** @typedef {PluginDefinition & EnvSyncPluginExtras} EnvSyncPluginDefinition */

module.exports = {};
