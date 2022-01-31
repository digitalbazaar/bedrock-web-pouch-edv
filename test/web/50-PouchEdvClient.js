/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {
  generateLocalId, initialize, PouchEdvClient, secrets
} from 'bedrock-web-pouch-edv';
import {mock} from './mock.js';

describe('PouchEdvClient API', function() {
  before(async () => {
    await initialize();
  });

  describe('createEdv', () => {
    it('should fail with both password and keys specified', async () => {
      const password = 'pw';
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      let error;
      try {
        await PouchEdvClient.createEdv({config, password});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('Error');
      error.message.should.equal(
        '"config" must not have "hmac" or "keyAgreementKey" if these are ' +
        'to be populated using locally generated secrets.');
    });
    it('should pass with no password', async () => {
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      const result = await PouchEdvClient.createEdv({config});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['config', 'edvClient']);
      should.not.exist(result.edvClient);
      should.exist(result.config);
      result.config.should.have.keys(
        ['id', 'controller', 'sequence', 'hmac', 'keyAgreementKey']);
    });
    it('should pass with password', async () => {
      const password = 'pw';
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      delete config.hmac;
      delete config.keyAgreementKey;
      const result = await PouchEdvClient.createEdv({config, password});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['config', 'edvClient']);
      should.exist(result.edvClient);
      should.exist(result.config);
      result.config.should.have.keys(
        ['id', 'controller', 'sequence', 'hmac', 'keyAgreementKey']);
    });
    it('should pass with pregenerated secret', async () => {
      const password = 'pw';
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      delete config.hmac;
      delete config.keyAgreementKey;

      // generate secret to simulate creating an EDV where secret generation
      // is successful but a failure occurs before the EDV config is inserted
      // allowing continuation of this process provided the password matches
      const {config: secretConfig} = await secrets.generate({
        id: config.id, password
      });
      await secrets.insert({config: secretConfig});

      const result = await PouchEdvClient.createEdv({config, password});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['config', 'edvClient']);
      should.exist(result.edvClient);
      should.exist(result.config);
      result.config.should.have.keys(
        ['id', 'controller', 'sequence', 'hmac', 'keyAgreementKey']);
    });
    it('should fail with pregenerated secret + invalid password', async () => {
      const password = 'pw';
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      delete config.hmac;
      delete config.keyAgreementKey;

      // generate secret to simulate creating an EDV where secret generation
      // is successful but a failure occurs before the EDV config is inserted
      // allowing continuation of this process provided the password matches
      const {config: secretConfig} = await secrets.generate({
        id: config.id, password
      });
      await secrets.insert({config: secretConfig});

      let error;
      try {
        await PouchEdvClient.createEdv({config, password: 'invalid'});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('Error');
      error.message.should.equal(
        `Secret already exists for EDV ID (${config.id}) but password to ` +
        'unlock it is invalid.');
    });
    it('should fail with duplicate EDV', async () => {
      // first insert EDV
      const password = 'pw';
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      delete config.hmac;
      delete config.keyAgreementKey;
      await PouchEdvClient.createEdv({config, password});

      // now try again
      let error;
      try {
        await PouchEdvClient.createEdv({config, password});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('DuplicateError');
      error.message.should.equal('Duplicate EDV configuration.');
    });
  });

  describe('fromLocalSecrets', () => {
    it('should fail due to not found', async () => {
      const password = 'pw';
      let error;
      try {
        const edvId = await generateLocalId();
        await PouchEdvClient.fromLocalSecrets({edvId, password});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('NotFoundError');
      error.message.should.equal('Configuration not found.');
    });
    it('should fail due to invalid password', async () => {
      const password = 'pw';
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      delete config.hmac;
      delete config.keyAgreementKey;
      await PouchEdvClient.createEdv({config, password});

      let error;
      try {
        await PouchEdvClient.fromLocalSecrets({
          edvId: config.id, password: 'invalid'
        });
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('Error');
      error.message.should.equal('Invalid password.');
    });
    it('should pass', async () => {
      const password = 'pw';
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      delete config.hmac;
      delete config.keyAgreementKey;
      await PouchEdvClient.createEdv({config, password});

      const edvClient = await PouchEdvClient.fromLocalSecrets({
        edvId: config.id, password
      });
      should.exist(edvClient);
      edvClient.should.be.an('object');
    });
  });

  describe('insert', () => {
    let edvClient;
    beforeEach(async () => {
      const password = 'pw';
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      delete config.hmac;
      delete config.keyAgreementKey;
      const result = await PouchEdvClient.createEdv({config, password});
      edvClient = result.edvClient;
    });
    it('should fail "doc.content" assertion', async () => {
      const doc = {};
      let error;
      try {
        await edvClient.insert({doc});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"content" must be an object.');
    });
    it('should pass', async () => {
      const doc = {
        id: await PouchEdvClient.generateId(),
        content: {},
        meta: {}
      };
      const result = await edvClient.insert({doc});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys([
        'id', 'sequence', 'indexed', 'jwe', 'content', 'meta'
      ]);
      result.id.should.equal(doc.id);
      result.sequence.should.equal(0);
    });
  });

  describe('update', () => {
    let edvClient;
    beforeEach(async () => {
      const password = 'pw';
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      delete config.hmac;
      delete config.keyAgreementKey;
      const result = await PouchEdvClient.createEdv({config, password});
      edvClient = result.edvClient;
    });
    it('should fail "doc.content" assertion', async () => {
      const doc = {};
      let error;
      try {
        await edvClient.update({doc});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"content" must be an object.');
    });
    it('should pass', async () => {
      const doc = {
        id: await PouchEdvClient.generateId(),
        content: {},
        meta: {}
      };
      const result = await edvClient.update({doc});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys([
        'id', 'sequence', 'indexed', 'jwe', 'content', 'meta'
      ]);
      result.id.should.equal(doc.id);
      result.sequence.should.equal(0);
    });
    it('should fail due to bad sequence', async () => {
      // first insert
      const doc = {
        id: await PouchEdvClient.generateId(),
        content: {},
        meta: {}
      };
      await edvClient.insert({doc});

      // then update w/o updating sequence
      let error;
      try {
        await edvClient.update({doc});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('InvalidStateError');
    });
    it('should pass with sequence change', async () => {
      // first insert
      const doc = {
        id: await PouchEdvClient.generateId(),
        content: {},
        meta: {},
        sequence: 0
      };
      await edvClient.insert({doc});

      // then update
      const result = await edvClient.update({doc});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys([
        'id', 'sequence', 'indexed', 'jwe', 'content', 'meta'
      ]);
      result.id.should.equal(doc.id);
      result.sequence.should.equal(1);
    });
  });

  describe('get', () => {
    let edvClient;
    beforeEach(async () => {
      const password = 'pw';
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      delete config.hmac;
      delete config.keyAgreementKey;
      const result = await PouchEdvClient.createEdv({config, password});
      edvClient = result.edvClient;
    });
    it('should fail "id" assertion', async () => {
      let error;
      try {
        await edvClient.get({id: false});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"id" must be a string.');
    });
    it('should fail due to not found error', async () => {
      // get non-existent doc
      let error;
      try {
        await edvClient.get({id: await PouchEdvClient.generateId()});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('NotFoundError');
      error.message.should.equal('Document not found.');
    });
    it('should pass', async () => {
      // first insert
      const doc = {
        id: await PouchEdvClient.generateId(),
        content: {},
        meta: {}
      };
      await edvClient.insert({doc});

      // then get document
      const result = await edvClient.get({id: doc.id});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys([
        'id', 'sequence', 'indexed', 'jwe', 'content', 'meta'
      ]);
      result.id.should.equal(doc.id);
      result.sequence.should.equal(0);
    });
  });

  describe('delete', () => {
    let edvClient;
    beforeEach(async () => {
      const password = 'pw';
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      delete config.hmac;
      delete config.keyAgreementKey;
      const result = await PouchEdvClient.createEdv({config, password});
      edvClient = result.edvClient;
    });
    it('should pass', async () => {
      // first insert
      const doc = {
        id: await PouchEdvClient.generateId(),
        content: {},
        meta: {},
        sequence: 0
      };
      await edvClient.insert({doc});

      // then delete document
      const result = await edvClient.delete({doc});
      should.exist(result);
      result.should.equal(true);
    });
  });
});
