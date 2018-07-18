#!/usr/bin/env node
'use strict';

const chalk = require('chalk');
const meow = require('meow');
const Listr = require('listr');
const inquirer = require('inquirer');
const ghGot = require('gh-got');
const travisGot = require('./lib/travis-got');
const GitHubPublisher = require('github-publish');
const rsa = require('ursa');
const yaml = require('js-yaml');
const clone = require('clone');
const deepEqual = require('fast-deep-equal');
const promisify = require('util.promisify');
const fs = require('fs');
const getStdin = require('get-stdin');
const jsonDiff = require('json-diff');

const pkg = require('./package.json');

const TRAVIS_YAML_AUTO_CREATED_COMMENT = '# Auto-generated by travis-env-sync\n';
const KEYCHAIN_SERVICE = 'travis-env-sync';
const ENV_VAR_TOKEN_PREFIX = 'ENV_';
const ENV_CONFIG_PREFIX = 'TRAVIS_ENV_SYNC_';

let keytar;

try {
  keytar = require('keytar');
} catch (e) {}

const userAgent = pkg.name.replace(/^@[^/]*\//, '') + '/' + pkg.version + (pkg.homepage ? ' (' + pkg.homepage + ')' : '');
const headers = Object.freeze({
  'User-Agent': userAgent
});

/**
 * Takes a .travis.yml fil and strips the encrypted parts of it (as the encrypted part can't be diffed)
 *
 * @param {string} file the contents of a .travis.yml
 * @returns {string} the secret-less file contents
 */
const getSecretLessTravisFile = (file) => {
  const result = clone(file);

  const notification = (((result.notifications || {}).slack || {}).rooms || [])[0] || {};
  delete notification.secure;

  return result;
};

/**
 * Error message used for failures to update
 *
 * Only used when the failOnUpdate flag has been set
 *
 * @class FailUpdateError
 * @extends {Error}
 */
class FailUpdateError extends Error {
  /**
   * @param {string} repo name of repository that the error relates to
   * @param {object} options
   * @param {string} options.diff the diff that's the cause of the failure – if any
   */
  constructor (repo, { diff } = {}) {
    super(`${repo} is out of sync`);
    this.name = 'FailUpdateError';
    this.repo = repo;
    this.diff = diff;
  }
}

const cli = meow(`
    Usage
      $ travis-env-sync <configuration-file>

    Options
      --keychain, -k        Use tokens from keychain
      --reset, -r           Reset tokens in keychain
      --all, -a             Accept existing .travis.yml files that don't contain the Travis Env Sync comment at the top
      --error-on-update -e  Error when encountering an out of sync existing .travis.yml in a repository, rather than replacing it
      --diff -d             Show diffs when --error-on-update errors

    Examples
      $ travis-env-sync -k </path/to/conf.yml>
`, {
  flags: {
    all: {
      type: 'boolean',
      alias: 'a'
    },
    diff: {
      type: 'boolean',
      alias: 'd'
    },
    keychain: {
      type: 'boolean',
      alias: 'k'
    },
    reset: {
      type: 'boolean',
      alias: 'r'
    },
    'error-on-update': {
      type: 'boolean',
      alias: 'e'
    }
  }
});

const configFilePath = cli.input[0];
const useKeychain = keytar && cli.flags.keychain;
const {
  all: allFlag,
  errorOnUpdate: failOnUpdate,
  diff: diffFlag,
  reset
} = cli.flags;

/**
 * Resolves needed tokens
 *
 * @param {Array.<Array.<string>>} tokens list of tokens to resolve. Strings should be in the order of: tokenIdentifier, tokenDescription, [envVar]
 */
const getTokens = (tokens) => {
  return (useKeychain ? keytar.findCredentials(KEYCHAIN_SERVICE) : Promise.resolve([]))
    .then(result => reset
      ? Promise.all(result.map(item => keytar.deletePassword(KEYCHAIN_SERVICE, item.account)))
        .then(() => ({}))
      : result.reduce((result, item) => {
        result[item.account] = item.password;
        return result;
      }, {})
    )
    .then(credentials => {
      const result = {};
      const prompts = [];

      Object.keys(tokens).forEach(resultName => {
        const [ tokenIdentifier, tokenDescription, envVar ] = tokens[resultName] || [];

        if (!tokenIdentifier) { return; }

        if (credentials[tokenIdentifier]) {
          result[resultName] = credentials[tokenIdentifier];
        } else if (envVar && process.env[envVar]) {
          result[resultName] = process.env[envVar];
        } else {
          prompts.push({
            type: 'password',
            message: tokenDescription,
            name: resultName
          });
        }
      });

      return (prompts.length ? inquirer.prompt(prompts) : Promise.resolve({}))
        .then(promptResults => {
          if (useKeychain) {
            Object.keys(promptResults).forEach(resultName => {
              if (promptResults[resultName]) {
                keytar.setPassword(KEYCHAIN_SERVICE, tokens[resultName][0], promptResults[resultName]);
              }
            });
          }
          return Object.assign(result, promptResults);
        });
    });
};

/**
 * Creates a Listr task for the specified repository
 *
 * @param {string} repo the name of the GitHub repository
 * @param {Object} options
 * @param {Object<string,any>} options.config
 * @param {Object<string,string>} options.token
 * @returns {Listr} the created Listr task for the repository
 */
const getListrTaskForRepo = (repo, { config, tokens }) => {
  const { travisToken, gitHubToken, slackToken } = tokens;
  const context = {};
  const encodedRepo = encodeURIComponent(repo);
  const [repoOwner, repoName] = repo.split('/');
  const baseTravisGotOptions = Object.freeze({ token: travisToken, private: !!config.private_travis, headers });
  const ghPublisher = new GitHubPublisher(gitHubToken, repoOwner, repoName);
  const skipSlackNotification = !slackToken || !config.slack;

  return new Listr([
    {
      title: 'Check repo Travis status',
      task: (ctx, task) => travisGot(`repo/${encodedRepo}`, baseTravisGotOptions)
        .then(result => {
          context.active = !!result.body.active;
          task.title = task.title + ': ' + (context.active ? chalk.green('Active') : chalk.red('Inactive'));
        })
    },
    {
      title: 'Set repo settings on Travis',
      task: () => {
        const tasks = [{
          title: 'Only build when there\'s a .travis.yml file',
          task: () => travisGot.patch(`repo/${encodedRepo}/setting/builds_only_with_travis_yml`, Object.assign({
            body: { 'setting.value': true }
          }, baseTravisGotOptions))
            .then(() => {})
        }];

        if (config.cron) {
          tasks.push({
            title: 'Set cron on master',
            task: () => travisGot.post(`repo/${encodedRepo}/branch/master/cron`, Object.assign({
              body: {
                'cron.interval': config.cron,
                'cron.dont_run_if_recent_build_exists': true
              }
            }, baseTravisGotOptions))
              .then(() => {})
          });
        }

        return new Listr(tasks, { concurrent: true });
      }
    },
    {
      title: 'Set env variable on Travis',
      task: () => new Listr([
        {
          title: 'Fetch existing env variables',
          task: () => travisGot(`repo/${encodedRepo}/env_vars`, baseTravisGotOptions)
            .then(result => {
              const secretEnvVars = config.secret_env_vars || [];

              context.existingSecretEnvVars = result.body.env_vars.reduce((result, item) => {
                if (secretEnvVars.includes(item.name)) {
                  result[item.name] = item;
                }
                return result;
              }, {});
            })
        },
        {
          title: 'Set secret env variables',
          task: () => new Listr((config.secret_env_vars || []).map(envVar => {
            return {
              title: 'Set ' + envVar,
              task: (ctx, task) => {
                const body = {
                  'env_var.name': envVar,
                  'env_var.value': tokens[ENV_VAR_TOKEN_PREFIX + envVar],
                  'env_var.public': false
                };

                const existing = context.existingSecretEnvVars[envVar];

                if (existing) {
                  task.title = 'Update ' + envVar;
                  return travisGot.patch(`repo/${encodedRepo}/env_var/${existing.id}`, Object.assign({ body }, baseTravisGotOptions))
                    .then(() => {});
                }

                task.title = 'Add ' + envVar;

                return travisGot.post(`repo/${encodedRepo}/env_vars`, Object.assign({ body }, baseTravisGotOptions))
                  .then(() => {});
              }
            };
          }), { concurrent: true })
        }
      ])
    },
    {
      title: 'Activate repo on Travis',
      skip: () => context.active === true,
      task: () => travisGot.post(`repo/${encodedRepo}/activate`, baseTravisGotOptions)
        .then(() => {})
    },
    {
      title: 'Set a .travis.yml to GitHub',
      task: () => new Listr([
        {
          title: 'Fetch required data',
          task: (ctx, task) => new Listr([
            {
              title: 'Fetch current file',
              task: () => ghPublisher.retrieve('.travis.yml')
                .then(({ content, sha }) => {
                  if (!content) { return; }

                  const ownsCurrentTravisFile = content.startsWith(TRAVIS_YAML_AUTO_CREATED_COMMENT);

                  if (allFlag || ownsCurrentTravisFile) {
                    context.currentTravisFile = yaml.safeLoad(content);
                    context.currentTravisSha = sha;

                    if (!ownsCurrentTravisFile) {
                      task.title = task.title + ' ' + chalk.inverse('(not created by Travis Env Sync)');
                    }
                  } else {
                    context.skipTravisFileUpdate = true;
                  }
                })
            },
            {
              title: 'Fetch public key',
              skip: () => skipSlackNotification,
              task: () => travisGot(`repo/${encodedRepo}/key_pair/generated`, baseTravisGotOptions)
                .then(result => { context.travisPublicKey = result.body.public_key; })
            }
          ])
        },
        {
          title: 'Encode values',
          skip: () => skipSlackNotification || context.skipTravisFileUpdate,
          task: () => {
            const publicKey = rsa.createPublicKey(context.travisPublicKey);
            const encryptedSlackCredentials = publicKey.encrypt(config.slack + ':' + slackToken, undefined, undefined, rsa.RSA_PKCS1_PADDING);
            context.encryptedSlackCredentials = encryptedSlackCredentials.toString('base64');
          }
        },
        {
          title: 'Create .travis.yml content',
          skip: () => context.skipTravisFileUpdate,
          task: () => {
            const travisYaml = clone(config.travis);

            if (context.encryptedSlackCredentials) {
              travisYaml.notifications = travisYaml.notifications || {};
              travisYaml.notifications.slack = travisYaml.notifications.slack || {};
              travisYaml.notifications.slack.rooms = travisYaml.notifications.slack.rooms || {};

              travisYaml.notifications.slack.rooms = [
                { secure: context.encryptedSlackCredentials }
              ];
            }

            context.newTravisFile = travisYaml;
          }
        },
        {
          title: 'Push .travis.yml if changed',
          skip: () => {
            // TODO: Handle the case of an uncontrolled file
            if (context.skipTravisFileUpdate) { return true; }
            if (!context.currentTravisFile) { return false; }

            const secretLessNew = getSecretLessTravisFile(context.newTravisFile);
            const secretLessCurrent = getSecretLessTravisFile(context.currentTravisFile);

            const isEqual = deepEqual(secretLessNew, secretLessCurrent);

            if (!isEqual && diffFlag) {
              context.diff = jsonDiff.diffString(secretLessCurrent, secretLessNew);
            }

            return isEqual;
          },
          task: () => {
            if (failOnUpdate) {
              return Promise.reject(new FailUpdateError(repo, { diff: context.diff }));
            }

            const yamlData = TRAVIS_YAML_AUTO_CREATED_COMMENT +
              yaml.safeDump(context.newTravisFile);

            return ghPublisher.publish('.travis.yml', yamlData, {
              sha: context.currentTravisSha,
              message: 'updating Travis CI conf through travis-env-sync'
            });
          }
        }
      ])
    }
  ]);
};

(configFilePath ? promisify(fs.readFile)(configFilePath) : getStdin())
  .then(yamlContent => yaml.safeLoad(yamlContent))
  .then(config => {
    const tokens = {
      travisToken: ['Travis Access Token', 'Travis Access Token', ENV_CONFIG_PREFIX + 'TRAVIS_TOKEN'],
      gitHubToken: ['GitHub Write Access Token', 'GitHub Write Access Token', ENV_CONFIG_PREFIX + 'GITHUB_TOKEN'],
      slackToken: config.slack ? ['Slack Token', 'Slack Token', ENV_CONFIG_PREFIX + 'SLACK_TOKEN'] : false
    };
    (config.secret_env_vars || []).forEach(value => {
      tokens[ENV_VAR_TOKEN_PREFIX + value] = ['Env variable ' + value, 'Env variable ' + value, ENV_CONFIG_PREFIX + value];
    });
    return getTokens(tokens)
      .then(tokens => ({ config, tokens }));
  })
  .then(({ config, tokens }) => new Listr([
    {
      title: 'Verifying access credentials',
      task: () => {
        return new Listr([
          {
            title: 'Travis CI Access Token',
            task: () => travisGot('user', { token: tokens.travisToken, private: true, headers })
              .then(answer => answer.body.name)
          },
          {
            title: 'GitHub Access Token',
            task: () => ghGot('user', { token: tokens.gitHubToken, headers })
              .then(answer => answer.body.name)
          }
        ], { concurrent: true });
      }
    },
    {
      title: 'Updating repository setups',
      task: () => new Listr(
        (config.repos || []).map(key => ({
          title: `Repo ${key}`,
          task: () => getListrTaskForRepo(key, { config, tokens })
        })),
        { concurrent: 3, exitOnError: false }
      )
    }
  ]))
  .then(tasks => tasks.run())
  // .catch(err => {
  //   console.log('😱', err.stack, err.errors);
  //   return Promise.reject(err);
  // })
  .catch(err => {
    console.error('\n' + chalk.red.underline.bold('Encountered some errors:') + '\n');

    if (err.name === 'ListrError' && err.errors) {
      err.errors.forEach(subError => {
        if (subError instanceof FailUpdateError) {
          console.error(`${chalk.red(subError.repo)} is out of sync`);
          if (subError.diff) {
            console.error(subError.diff);
          }
        } else {
          console.error(`${chalk.red('Error')}: ${err.name}: ${err.message}`);
        }
      });
    } else {
      console.error(`${chalk.red('Error')}: ${err.name}: ${err.message}`);
    }

    console.error('');

    process.exit(1);
  });
