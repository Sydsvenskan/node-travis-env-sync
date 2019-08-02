// @ts-check
/// <reference types="node" />

'use strict';

module.exports = {
  name: 'travis',
  secrets: ['travis'],
  secretProviders: {
    'travis': 'Provides a Travis CI API v3 token'
  }
};
