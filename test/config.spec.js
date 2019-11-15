// @ts-check
/// <reference types="node" />
/// <reference types="mocha" />
/// <reference types="chai" />
/// <reference types="sinon" />
/// <reference types="sinon-chai" />

'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

const should = chai.should();

describe('Config', () => {
  beforeEach(() => {
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('main', () => {
    const { mergeTargetAndBaseConfig } = require('../lib/config');

    it('should throw on invalid input', () => {
      // @ts-ignore
      should.Throw(() => { mergeTargetAndBaseConfig(); }, TypeError, 'Expected target config to be a plain object');
      // @ts-ignore
      should.Throw(() => { mergeTargetAndBaseConfig(123); }, TypeError, 'Expected target config to be a plain object');
    });

    it('should be able to merge two simple configs', () => {
      const baseConfig = { baseDir: 'abc' };
      const targetConfig = {};

      const result = mergeTargetAndBaseConfig(targetConfig, baseConfig);

      result.should.deep.equal({
        config: {
          baseDir: 'abc',
          plugins: [],
          settings: {}
        }
      });

      baseConfig.should.deep.equal({ baseDir: 'abc' });
      targetConfig.should.deep.equal({});
    });

    it('should be able to merge two plugins between configs', () => {
      const baseConfig = { baseDir: 'abc', plugins: ['foo'] };
      const targetConfig = { config: { plugins: ['bar'] } };

      const result = mergeTargetAndBaseConfig(targetConfig, baseConfig);

      result.should.deep.equal({
        config: {
          baseDir: 'abc',
          plugins: ['foo', 'bar'],
          settings: {}
        }
      });

      baseConfig.should.deep.equal({ baseDir: 'abc', plugins: ['foo'] });
      targetConfig.should.deep.equal({ config: { plugins: ['bar'] } });
    });

    it('should be able to merge settings between configs', () => {
      const baseConfig = { baseDir: 'abc', settings: { foo: 'wow', bar: 'yeah' } };
      const targetConfig = { config: { settings: { foo: 'xyz', pqr: 'def' } } };

      const result = mergeTargetAndBaseConfig(targetConfig, baseConfig);

      result.should.deep.equal({
        config: {
          baseDir: 'abc',
          plugins: [],
          settings: {
            foo: ['wow', 'xyz'],
            bar: ['yeah'],
            pqr: ['def']
          }
        }
      });

      baseConfig.should.deep.equal({ baseDir: 'abc', settings: { foo: 'wow', bar: 'yeah' } });
      targetConfig.should.deep.equal({ config: { settings: { foo: 'xyz', pqr: 'def' } } });
    });

    it('should clone object settings', () => {
      const foo = { wow: 'w00t1' };
      const bar = { wow: 'w00t2' };
      const pqr = { wow: 'w00t3' };
      const foo2 = { wow: 'w00t4' };

      const baseConfig = { baseDir: 'abc', settings: { foo, bar } };
      const targetConfig = { config: { settings: { foo: foo2, pqr } } };

      const result = mergeTargetAndBaseConfig(targetConfig, baseConfig);

      result.should.deep.equal({
        config: {
          baseDir: 'abc',
          plugins: [],
          settings: {
            foo: [{ wow: 'w00t1' }, { wow: 'w00t4' }],
            bar: [{ wow: 'w00t2' }],
            pqr: [{ wow: 'w00t3' }]
          }
        }
      });

      result.should.not.have.nested.property('config.settings.foo[0]', foo);
      result.should.not.have.nested.property('config.settings.bar[0]', bar);
      result.should.not.have.nested.property('config.settings.pqr[0]', pqr);
      result.should.not.have.nested.property('config.settings.foo[1]', foo2);
    });
  });
});
