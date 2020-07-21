// @ts-check
/// <reference types="node" />

'use strict';

const { initEnvSync } = require('./lib/init');
const { doEnvSync } = require('./lib/sync');

module.exports = {
  initEnvSync,
  doEnvSync
};
