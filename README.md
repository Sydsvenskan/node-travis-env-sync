# Travis-Env-Sync

Syncs Travis settings and `.travis.yml` across a large number of repositories

Sets Travis settings for only building when there's a `.travis.yml` and optionally sets cron and secret environment variables (adds or updates). Also builds and pushes a `.travis.yml` with optionally an encrypted Slack notification.

Built to support both both Travis _.org_ and _.com_, but only tested with _.com_.

[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat)](https://github.com/Flet/semistandard)

## Install

```bash
npm install -g @hdsydsvenskan/travis-env-sync
```

## Syntax

```bash
travis-env-sync config.yml
```

Or:

```bash
cat config.yml | travis-env-sync
```

## Flags

* `--keychain` / `-k` – use Keychain to store secrets (or non-Mac equivalent supported by [keytar](https://www.npmjs.com/package/keytar))
* `--reset` / `-r` – reset the data in the Keychain, so new data can be defined
* `--help`
* `--version`

## Config file

Example:

```yaml
repos:
  - 'example/example'
cron: 'weekly'
slack: 'slackorganization'
private_travis: true
secret_env_vars:
  - 'NPM_TOKEN'
travis:
  language: node_js
  node_js:
    - '8'
    - '6'
  sudo: false
  before_install:
    - echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > .npmrc
```

### Config keys

* **repos** – a list of all the repos to update
* **travis** – the actual Travis configuration
* **[cron]** – _optional_ – set to `weekly`, `daily` or `monthly` to set up a cron job to run for `master` if it hasn't recently built
* **[private_travis]** – _optional_ – set to `true` if your targeting private repos (you can't target both private and public repos at once as Travis runs the two at two different API:s)
* **[secret_env_vars]** –  _optional_ – secret environment variables that should be saved to Travis and, if chosen, saved to Keychain. Value will be prompted for.
* **[slack]** –  _optional_ – the name of the Slack account to send notifications to
