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

      it('should handle a simple single dependency free plugin', () => {
        const plugin = {};

        loadPluginStub.onFirstCall().returns(plugin);

        const result = resolvePluginTree(['foo'], loadPluginStub);
        should.exist(result);
        result.should.have.property(0, plugin);
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

      it('should wrap errors thrown when loading', () => {
        loadPluginStub.throws();

        should.Throw(() => {
          resolvePluginTree(['foo'], loadPluginStub);
        }, /Failed to load plugin "foo"/);
      });
    });

    describe('dependency tree', () => {
      it('should load subdependencies and order dependencies to fulfill prior dependencies', () => {
        loadPluginStub.withArgs('foo').returns({
          name: 'foo',
          plugins: ['xyz', 'abc']
        });
        loadPluginStub.withArgs('xyz').returns({
          name: 'xyz',
          plugins: ['bar']
        });
        loadPluginStub.withArgs('abc').returns({
          name: 'abc'
        });
        loadPluginStub.withArgs('bar').returns({
          name: 'bar'
        });

        const result = resolvePluginTree(['foo', 'bar'], loadPluginStub);
        should.exist(result);
        result.should.deep.equal([
          {
            name: 'bar'
          },
          {
            name: 'xyz',
            plugins: [
              'bar'
            ]
          },
          {
            name: 'abc'
          },
          {
            name: 'foo',
            plugins: [
              'xyz',
              'abc'
            ]
          }
        ]);
      });

      it('should throw on circular dependencies', () => {
        loadPluginStub.withArgs('foo').returns({
          name: 'foo',
          plugins: ['bar']
        });
        loadPluginStub.withArgs('bar').returns({
          name: 'bar',
          plugins: ['foo']
        });

        should.Throw(() => {
          resolvePluginTree(['foo'], loadPluginStub);
        }, /Failed to add plugin "bar"/);
      });
    });
  });
});
