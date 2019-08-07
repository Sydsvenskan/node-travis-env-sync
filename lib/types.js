// @ts-check
/// <reference types="node" />

'use strict';

/** @typedef {import('./utils/resolve-plugins').PluginDefinition} PluginDefinition */
/** @typedef {import('./config').ResolvedTargetConfig} ResolvedTargetConfig */
/** @typedef {import('./config').EnvSyncConfig} EnvSyncConfig */

/**
 * @typedef EnvSyncSecret
 * @property {boolean} required
 * @property {EnvSyncPluginDefinition} provider
 */

/**
 * @typedef EnvSyncBase
 * @property {EnvSyncPluginDefinition[]} plugins
 * @property {{[secret: string]: EnvSyncSecret}} secrets
 */

/** @typedef {ResolvedTargetConfig & EnvSyncBase} EnvSyncTarget */

/** @typedef {(step: string, message: string, data?: Object<string,any>) => (void|Promise<void>)} EnvSyncStatusCallback */

/**
 * @typedef EnvData
 * @property {{ [secret: string]: string }} [secrets]
 */

/**
 * @typedef EnvSyncPluginRunOptions
 * @property {EnvData} envData
 * @property {EnvSyncTarget} config
 * @property {EnvSyncStatusCallback} statusCallback
 */

/** @typedef {EnvSyncPluginRunOptions & {repo: string}} EnvSyncPluginRunOnRepoOptions */

/**
 * @typedef EnvSyncSecretStore
 * @property {(key: string) => (string|Promise<string>)} get
 * @property {(key: string) => (void|Promise<void>)} [remove]
 * @property {(key: string, value: string) => (void|Promise<void>)} [set]
 */

/**
 * @typedef EnvSyncPluginExtras
 * @property {string} [name]
 * @property {string[]} [secrets]
 * @property {{ [secretName: string]: string }} [secretProviders]
 * @property {EnvSyncSecretStore} [secretStore]
 * @property {(options: EnvSyncPluginRunOptions) => (void|Promise<void>)} [run]
 * @property {(options: EnvSyncPluginRunOnRepoOptions) => (void|Promise<void>)} [runOnRepo]
 */

/** @typedef {PluginDefinition & EnvSyncPluginExtras} EnvSyncPluginDefinition */

module.exports = {};
