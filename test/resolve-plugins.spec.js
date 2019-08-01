'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

chai.use(chaiAsPromised);

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
      it('should require plugin list to be an array',() => {
        return resolvePluginTree()
          .should.be.rejectedWith(/Expected plugins to be an array of strings/);
      });

      it('should require loadPlugin to be a function', () => {
        return resolvePluginTree(['foo'])
          .should.be.rejectedWith(/Expected loadPlugin to be a function/);
      });

      it('should return an empty plugin list straight up', async () => {
        const result = await resolvePluginTree([], loadPluginStub);
        should.exist(result);
        result.should.deep.equal([]);
      });

      it('should handle a simple single dependency free plugin', async () => {
        const plugin = {};

        loadPluginStub.onFirstCall().returns(plugin);

        const result = await resolvePluginTree(['foo'], loadPluginStub);
        should.exist(result);
        result.should.have.property(0, plugin);
      });
    });

    describe('plugin loading', () => {
      it('should keep track of missing dependencies', () => {
        loadPluginStub.onFirstCall().returns(undefined);
        loadPluginStub.onSecondCall().returns({});
        loadPluginStub.onThirdCall().returns(undefined);

        return resolvePluginTree(['foo', 'bar', 'abc'], loadPluginStub)
          .should.be.rejectedWith(/Plugins missing: "foo", "abc"/);
      });

      it('should handle single missing dependency', () => {
        loadPluginStub.onFirstCall().returns({});
        loadPluginStub.onSecondCall().returns(undefined);

        return resolvePluginTree(['foo', 'bar'], loadPluginStub)
          .should.be.rejectedWith(/Plugin missing: "bar"/);
      });

      it('should wrap errors thrown when loading', () => {
        loadPluginStub.throws();

        return resolvePluginTree(['foo'], loadPluginStub)
          .should.be.rejectedWith(/Failed to load plugin "foo"/);
      });
    });

    describe('dependency tree', () => {
      it('should load subdependencies and order dependencies to fulfill prior dependencies', async () => {
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

        const result = await resolvePluginTree(['foo', 'bar'], loadPluginStub);
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

        return resolvePluginTree(['foo'], loadPluginStub)
          .should.be.rejectedWith(/Failed to add plugin "bar"/);
      });
    });
  });
});
