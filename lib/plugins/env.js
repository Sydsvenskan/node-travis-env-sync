// @ts-check
/// <reference types="node" />

'use strict';

const debug = require('debug')('envsync');

/** @type {import('../types').EnvSyncPluginDefinition} */
module.exports = {
  name: 'env',
  secretStore: {
    get: secret => {
      const envName = 'ENVSYNC_SECRET_' + secret.replace(/\W+/g, '_').toUpperCase();
      const result = process.env[envName];

      if (result !== undefined) {
        debug('Found secret in env variable: %s', envName);
      } else {
        debug('No secret found in env variable: %s', envName);
      }

      return result;
    }
  }
};
