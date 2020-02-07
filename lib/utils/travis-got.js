// @ts-check
/// <reference types="node" />
/// <reference types="got" />

'use strict';

// TODO: Extract to its own repo

const got = require('got');

/**
 * @typedef TravisGotOptions
 * @property {string} [endpoint]
 * @property {{ [header: string]: string }} [headers]
 * @property {boolean} [private]
 * @property {string} [token]
 */

/**
 * @param {string} path
 * @param {TravisGotOptions} opts
 * @returns {Promise<any>}
 */
const travisGot = function (path, opts = {}) {
  if (typeof path !== 'string') {
    return Promise.reject(new TypeError(`Expected \`path\` to be a string, got ${typeof path}`));
  }

  opts = Object.assign({
    json: true,
    endpoint: opts.private ? 'https://api.travis-ci.com/' : 'https://api.travis-ci.org/'
  }, opts);

  opts.headers = Object.assign({
    'Travis-API-Version': '3',
    'user-agent': 'https://github.com/sydsvenskan/node-travis-env-sync'
  }, opts.headers);

  if (opts.token) {
    opts.headers.authorization = `token ${opts.token}`;
  }

  const url = /^https?/.test(path) ? path : opts.endpoint + path;

  return got(url, opts);
};

module.exports = travisGot;
