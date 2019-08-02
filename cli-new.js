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
    // FIXME: Resolve some secrets!
    console.log('Lets resolve some secrets!');
  }

  const resolvedEnv = {};

  for (const target of targets) {
    doEnvSync(target, resolvedEnv, { statusCallback: (...params) => { console.log('😁', ...params); } });
  }
}).catch(err => {
  // eslint-disable-next-line no-console
  console.error(err.stack);
  process.exit(1);
});
