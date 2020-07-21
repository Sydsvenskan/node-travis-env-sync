// @ts-check
/// <reference types="node" />

'use strict';

const debug = require('debug')('envsync');

/** @type {import('../types').EnvSyncPluginDefinition} */
module.exports = {
  name: 'settings-secrets',
  secretStore: {
    get: (secret, settings) => {
      console.log('🐰', settings, secret);
      /** @type {any} */
      const result = settings ? settings[secret] : undefined;

      if (result === undefined) {
        debug('No secret found in settings for: %s', secret);
      } else if (typeof result !== 'string') {
        // TODO: Add tests for this
        throw new TypeError(`Invalid data type for secret "${secret}": ${typeof result}`);
      } else {
        debug('Found secret in settings for: %s', secret);
      }

      return result;
    }
  }
};
