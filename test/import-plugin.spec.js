// @ts-check
/// <reference types="node" />
/// <reference types="chai" />
/// <reference types="sinon" />
/// <reference types="sinon-chai" />

'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

chai.use(sinonChai);

const should = chai.should();

describe('Import Plugin', () => {
  beforeEach(() => {
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('normalizePluginName()', () => {
    const { normalizePluginName } = require('../lib/utils/import-plugin');

    it('should require a string pluginName argument', () => {
      // @ts-ignore
      should.Throw(() => { normalizePluginName(); }, 'Invalid pluginName, expected a non-empty string');
      // @ts-ignore
      should.Throw(() => { normalizePluginName(123); }, 'Invalid pluginName, expected a non-empty string');
    });

    it('should throw on upwards directory traversing', () => {
      should.not.Throw(() => { normalizePluginName('./foo/../bar/'); });
      should.Throw(() => { normalizePluginName('./foo/../../bar/'); }, 'Plugin name attempts directory traversal: "./foo/../../bar/"');
    });

    it('should return simple plugin name unaltered', () => {
      const result = normalizePluginName('foo');
      should.exist(result);
      result.should.equal('foo');
    });

    it('should add prefix when one is set', () => {
      const result = normalizePluginName('foo', { prefix: 'example-prefix-' });
      should.exist(result);
      result.should.equal('example-prefix-foo');
    });

    it('should not add prefix if already prefixed', () => {
      const result = normalizePluginName('example-prefix-foo', { prefix: 'example-prefix-' });
      should.exist(result);
      result.should.equal('example-prefix-foo');
    });

    it('should return normalized local path unaltered', () => {
      normalizePluginName('./foo/../bar/', { prefix: 'example-prefix-' })
        .should.equal('./bar/');
      normalizePluginName('./foo', { prefix: 'example-prefix-' })
        .should.equal('./foo');
      normalizePluginName('./foo/../bar/')
        .should.equal('./bar/');
      normalizePluginName('./foo')
        .should.equal('./foo');
    });
  });

  describe('importPluginsFrom()', () => {
    const baseDir = __dirname;

    /** @type {sinon.SinonStub} */
    let importFromStub;
    let importPluginsFrom;
    /** @type {sinon.SinonStub} */
    let normalizePluginNameStub;

    beforeEach(() => {
      importFromStub = sinon.stub();

      const importPluginModule = proxyquire('../lib/utils/import-plugin', {
        'import-from': { silent: importFromStub }
      });

      normalizePluginNameStub = sinon.stub(importPluginModule, 'normalizePluginName');
      importPluginsFrom = importPluginModule.importPluginsFrom;
    });

    it('should require a string baseDir argument', () => {
      // @ts-ignore
      should.Throw(() => { importPluginsFrom(); }, 'Invalid baseDir, expected a non-empty string');
      // @ts-ignore
      should.Throw(() => { importPluginsFrom(123); }, 'Invalid baseDir, expected a non-empty string');
    });

    it('should return a function', () => {
      const result = importPluginsFrom(baseDir);
      should.exist(result);
      result.should.be.a('function');
    });

    describe('loading', () => {
      let importPlugin;

      beforeEach(() => {
        importPlugin = importPluginsFrom(baseDir);
      });

      it('should import a plugin', () => {
        const fakeModule = {};

        normalizePluginNameStub.returnsArg(0);
        importFromStub.returns(fakeModule);

        const result = importPlugin('foo');

        should.exist(result);
        result.should.equal(fakeModule);
        importFromStub.should.have.been.calledOnce.and.calledWith(baseDir, 'foo');
      });

      it('should normalize pluginName before importing it', () => {
        normalizePluginNameStub.returns('bar');

        importPlugin('foo');

        normalizePluginNameStub.should.have.been.calledOnce.and.calledWith('foo');
        importFromStub.should.have.been.calledOnce.and.calledWithExactly(baseDir, 'bar');
      });

      it('should support resolving a prefix on a pluginName', () => {
        importPlugin = importPluginsFrom(baseDir, { prefix: 'example-prefix-' });
        importPlugin('foo');

        normalizePluginNameStub.should.have.been.calledOnce.and.calledWithExactly('foo', { prefix: 'example-prefix-' });
      });
    });
  });
});
