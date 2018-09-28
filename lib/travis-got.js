'use strict';

// TODO: Extract to its own repo

const got = require('got');

function travisGot (path, opts = {}) {
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

  if (opts.stream) {
    return got.stream(url, opts);
  }

  return got(url, opts);
}

const helpers = [
  'get',
  'post',
  'put',
  'patch',
  'head',
  'delete'
];

travisGot.stream = (url, opts) => travisGot(url, Object.assign({}, opts, {
  json: false,
  stream: true
}));

for (const x of helpers) {
  const method = x.toUpperCase();
  travisGot[x] = (url, opts) => travisGot(url, Object.assign({}, opts, { method }));
  travisGot.stream[x] = (url, opts) => travisGot.stream(url, Object.assign({}, opts, { method }));
}

module.exports = travisGot;
