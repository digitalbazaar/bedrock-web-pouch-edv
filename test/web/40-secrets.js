/*!
 * Copyright (c) 2022-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {generateLocalId, initialize, secrets} from '@bedrock/web-pouch-edv';

describe('secrets API', function() {
  before(async () => {
    await initialize();
  });

  describe('generate', () => {
    it('should fail with wrong version', async () => {
      let error;
      try {
        await secrets.generate({id: '', version: '0', password: 'pw'});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('Error');
      error.message.should.equal('"version" must be "1".');
    });
    it('should fail with bad "id"', async () => {
      let error;
      try {
        await secrets.generate({id: false, version: '1', password: 'pw'});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"id" must be a string.');
    });
    it('should fail with bad "password"', async () => {
      let error;
      try {
        await secrets.generate({id: '', version: '1', password: false});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"password" must be a string.');
    });
    it('should pass', async () => {
      const result = await secrets.generate({
        id: await generateLocalId(), password: 'pw'
      });
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['hmac', 'keyAgreementKey', 'config']);
      should.exist(result.config);
      result.config.should.have.keys(
        ['id', 'hmacId', 'keyAgreementKeyId', 'secret', 'sequence']);
      should.exist(result.config.secret);
      result.config.secret.should.have.keys(['version', 'salt', 'wrappedKey']);
    });
    it('should pass using "fips" cipher version', async () => {
      const result = await secrets.generate({
        id: await generateLocalId(), password: 'pw', cipherVersion: 'fips'
      });
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['hmac', 'keyAgreementKey', 'config']);
      should.exist(result.config);
      result.config.should.have.keys(
        ['id', 'hmacId', 'keyAgreementKeyId', 'secret', 'sequence']);
      should.exist(result.config.secret);
      result.config.secret.should.have.keys(
        ['version', 'salt', 'wrappedKey', 'wrappedKeyAgreementKey']);
    });
  });

  describe('decrypt', () => {
    it('should fail "config.id" assertion', async () => {
      const password = 'pw';
      const {config} = await secrets.generate({
        id: await generateLocalId(), password
      });
      config.id = false;
      let error;
      try {
        await secrets.decrypt({config, password});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"config.id" must be a string.');
    });
    it('should fail "config.sequence" assertion', async () => {
      const password = 'pw';
      const {config} = await secrets.generate({
        id: await generateLocalId(), password
      });
      config.sequence = false;
      let error;
      try {
        await secrets.decrypt({config, password});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal(
        '"config.sequence" must be a non-negative safe integer.');
    });
    it('should fail "config.hmacId" assertion', async () => {
      const password = 'pw';
      const {config} = await secrets.generate({
        id: await generateLocalId(), password
      });
      config.hmacId = false;
      let error;
      try {
        await secrets.decrypt({config, password});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"config.hmacId" must be a string.');
    });
    it('should fail "config.keyAgreementKeyId" assertion', async () => {
      const password = 'pw';
      const {config} = await secrets.generate({
        id: await generateLocalId(), password
      });
      config.keyAgreementKeyId = false;
      let error;
      try {
        await secrets.decrypt({config, password});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal(
        '"config.keyAgreementKeyId" must be a string.');
    });
    it('should fail due to invalid password', async () => {
      const password = 'pw';
      const {config} = await secrets.generate({
        id: await generateLocalId(), password
      });
      const result = await secrets.decrypt({config, password: 'invalid'});
      should.equal(result, null);
    });
    it('should pass', async () => {
      const password = 'pw';
      const {config} = await secrets.generate({
        id: await generateLocalId(), password
      });
      const result = await secrets.decrypt({config, password});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['hmac', 'keyAgreementKey', 'cipherVersion']);
      result.cipherVersion.should.equal('recommended');
    });
    it('should pass using "fips" cipher version', async () => {
      const password = 'pw';
      const {config} = await secrets.generate({
        id: await generateLocalId(), password, cipherVersion: 'fips'
      });
      const result = await secrets.decrypt({config, password});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['hmac', 'keyAgreementKey', 'cipherVersion']);
      result.cipherVersion.should.equal('fips');
    });
  });

  describe('insert', () => {
    it('should fail "config.id" assertion', async () => {
      const {config} = await secrets.generate({
        id: await generateLocalId(), password: 'pw'
      });
      config.id = false;
      let error;
      try {
        await secrets.insert({config});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"config.id" must be a string.');
    });
    it('should fail "config.sequence" assertion', async () => {
      const {config} = await secrets.generate({
        id: await generateLocalId(), password: 'pw'
      });
      config.sequence = false;
      let error;
      try {
        await secrets.insert({config});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal(
        '"config.sequence" must be a non-negative safe integer.');
    });
    it('should fail "config.hmacId" assertion', async () => {
      const {config} = await secrets.generate({
        id: await generateLocalId(), password: 'pw'
      });
      config.hmacId = false;
      let error;
      try {
        await secrets.insert({config});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"config.hmacId" must be a string.');
    });
    it('should fail "config.keyAgreementKeyId" assertion', async () => {
      const {config} = await secrets.generate({
        id: await generateLocalId(), password: 'pw'
      });
      config.keyAgreementKeyId = false;
      let error;
      try {
        await secrets.insert({config});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal(
        '"config.keyAgreementKeyId" must be a string.');
    });
    it('should pass', async () => {
      const {config} = await secrets.generate({
        id: await generateLocalId(), password: 'pw'
      });
      const result = await secrets.insert({config});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['_id', '_rev', 'config']);
      should.exist(result.config);
      result.config.should.have.keys(
        ['id', 'hmacId', 'keyAgreementKeyId', 'secret', 'sequence']);
      should.exist(result.config.secret);
      result.config.secret.should.have.keys(['version', 'salt', 'wrappedKey']);
    });
    it('should fail due to duplicate config', async () => {
      const {config} = await secrets.generate({
        id: await generateLocalId(), password: 'pw'
      });
      await secrets.insert({config});

      // insert same config again
      let error;
      try {
        await secrets.insert({config});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('ConstraintError');
      error.message.should.equal(
        'Could not insert document; uniqueness constraint violation.');
    });
  });

  describe('update', () => {
    it('should fail due to bad sequence', async () => {
      // first insert config
      const {config} = await secrets.generate({
        id: await generateLocalId(), password: 'pw'
      });
      const record = await secrets.insert({config});

      // then update config w/o updating sequence
      let error;
      try {
        await secrets.update({config: record.config});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('InvalidStateError');
      error.message.should.equal(
        'Could not update configuration. Sequence does not match or ' +
        'configuration does not exist.');
    });
    it('should fail due to not found', async () => {
      // update non-existent config
      const {config} = await secrets.generate({
        id: await generateLocalId(), password: 'pw'
      });
      let error;
      try {
        await secrets.update({config});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('InvalidStateError');
      error.message.should.equal(
        'Could not update configuration. Sequence does not match or ' +
        'configuration does not exist.');
    });
    it('should pass', async () => {
      // first insert config
      const {config} = await secrets.generate({
        id: await generateLocalId(), password: 'pw'
      });
      const record = await secrets.insert({config});

      // then update config
      const newConfig = {...record.config};
      newConfig.sequence++;
      const result = await secrets.update({config: newConfig});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['_id', '_rev', 'config']);
      should.exist(result.config);
      result.config.should.have.keys(
        ['id', 'hmacId', 'keyAgreementKeyId', 'secret', 'sequence']);
    });
  });

  describe('get', () => {
    it('should fail "id" assertion', async () => {
      let error;
      try {
        await secrets.get({id: false});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"id" must be a string.');
    });
    it('should fail due to not found error', async () => {
      // get non-existent config
      let error;
      try {
        await secrets.get({id: 'not found'});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('NotFoundError');
      error.message.should.equal('Configuration not found.');
    });
    it('should pass', async () => {
      // first insert config
      const {config} = await secrets.generate({
        id: await generateLocalId(), password: 'pw'
      });
      const inserted = await secrets.insert({config});

      // then get config
      const record = await secrets.get({id: config.id});
      record.should.eql(inserted);
    });
  });
});
