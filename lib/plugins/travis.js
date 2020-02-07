// @ts-check
/// <reference types="node" />

'use strict';

/** @type {import('../types').EnvSyncPluginDefinition} */
module.exports = {
  name: 'travis',
  secrets: ['travis'],
  secretProviders: {
    'travis': 'Provide a Travis CI API v3 token'
  },
  testSecret: () => {
    console.log('wow2!');
  },
  run: () => {
    console.log('wow!');
  },
  runOnRepo: ({ repo }) => {
    console.log('wow3!', repo);
  }
};
