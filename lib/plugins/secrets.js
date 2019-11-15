// @ts-check
/// <reference types="node" />

'use strict';

const debug = require('debug')('envsync');

/** @type {import('../types').EnvSyncPluginDefinition} */
module.exports = {
  name: 'secrets',
  secretStore: {
    get: (secret, settings) => {
      console.log('🐰', settings, secret);
      const result = (settings || {})[secret];

      if (result !== undefined) {
        debug('Found secret in settings for: %s', secret);
      } else {
        debug('No secret found in settings for: %s', secret);
      }

      return result;
    }
  }
};
