#!/usr/bin/env node

'use strict';

// @ts-check
/// <reference types="node" />

const {
  initEnvSync,
  doEnvSync
} = require('.');

initEnvSync({
  baseDir: __dirname,
  plugins: ['./lib/plugins/travis']
}).then(async (result) => {
  const {
    targets,
    secrets
  } = result;

  const secretNames = Object.keys(secrets);

  if (secretNames) {
    console.log('Lets resolve some secrets!');
  }

  console.log('💪', targets, secrets);

  const resolvedEnv = {};

  for (const target of targets) {
    doEnvSync(target, resolvedEnv);
  }
}).catch(err => {
  // eslint-disable-next-line no-console
  console.error(err.stack);
  process.exit(1);
});
