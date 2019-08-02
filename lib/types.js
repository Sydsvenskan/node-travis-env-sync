// @ts-check
/// <reference types="node" />

'use strict';

/** @typedef {import('./utils/resolve-plugins').PluginDefinition} PluginDefinition */

/**
 * @typedef EnvSyncPluginExtras
 * @property {string[]} [secrets]
 * @property {{ [secretName: string]: string }} [secretProviders]
 */

/** @typedef {PluginDefinition & EnvSyncPluginExtras} EnvSyncPluginDefinition */

module.exports = {};
