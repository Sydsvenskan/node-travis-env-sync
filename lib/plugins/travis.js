// @ts-check
/// <reference types="node" />

'use strict';

/** @type {import('../types').EnvSyncPluginDefinition} */
module.exports = {
  name: 'travis',
  secrets: ['travis'],
  secretProviders: {
    'travis': 'Provides a Travis CI API v3 token'
  },
  testSecret: () => {
    console.log('wow2!');
  },
  run: () => {
    console.log('wow!');
  }
};
