'use strict';

const chai = require('chai');
const sinon = require('sinon');

const should = chai.should();

describe('Resolve Plugins', function () {
  const { resolvePluginTree } = require('../lib/utils/resolve-plugins');

  let loadPluginStub;

  beforeEach(() => {
    loadPluginStub = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('resolvePluginTree()', () => {
    describe('basic', () => {
      it('should require plugin list to be an array', () => {
        should.Throw(() => { resolvePluginTree(); }, /Expected plugins to be an array of strings/);
      });

      it('should require loadPlugin to be a function', () => {
        should.Throw(() => { resolvePluginTree(['foo']); }, /Expected loadPlugin to be a function/);
      });

      it('should return an empty plugin list straight up', () => {
        const result = resolvePluginTree([], loadPluginStub);
        should.exist(result);
        result.should.deep.equal([]);
      });
    });

    describe('plugin loading', () => {
      it('should keep track of missing dependencies', () => {
        loadPluginStub.onFirstCall().returns(undefined);
        loadPluginStub.onSecondCall().returns({});
        loadPluginStub.onThirdCall().returns(undefined);

        should.Throw(() => {
          resolvePluginTree(['foo', 'bar', 'abc'], loadPluginStub);
        }, /Plugins missing: "foo", "abc"/);
      });

      it('should handle single missing dependency', () => {
        loadPluginStub.onFirstCall().returns({});
        loadPluginStub.onSecondCall().returns(undefined);

        should.Throw(() => {
          resolvePluginTree(['foo', 'bar'], loadPluginStub);
        }, /Plugin missing: "bar"/);
      });
    });
  });
});
