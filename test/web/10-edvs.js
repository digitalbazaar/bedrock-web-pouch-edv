/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {edvs, generateLocalId, initialize} from '@bedrock/web-pouch-edv';
import {mock} from './mock.js';

describe('edvs API', function() {
  before(async () => {
    await initialize();
  });

  describe('insert', () => {
    it('should fail "config.id" assertion', async () => {
      const config = {
        ...mock.config,
        id: false
      };
      let error;
      try {
        await edvs.insert({config});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"config.id" must be a string.');
    });
    it('should fail "config.controller" assertion', async () => {
      const config = {
        ...mock.config,
        controller: false
      };
      let error;
      try {
        await edvs.insert({config});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"config.controller" must be a string.');
    });
    it('should fail "config.sequence" assertion', async () => {
      const config = {
        ...mock.config,
        sequence: false
      };
      let error;
      try {
        await edvs.insert({config});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal(
        '"config.sequence" must be a non-negative safe integer.');
    });
    it('should fail "config.hmac" assertion', async () => {
      const config = {
        ...mock.config,
        hmac: false
      };
      let error;
      try {
        await edvs.insert({config});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"config.hmac" must be an object.');
    });
    it('should fail "config.keyAgreementKey" assertion', async () => {
      const config = {
        ...mock.config,
        keyAgreementKey: false
      };
      let error;
      try {
        await edvs.insert({config});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"config.keyAgreementKey" must be an object.');
    });
    it('should pass', async () => {
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      const result = await edvs.insert({config});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['_id', '_rev', 'config']);
      should.exist(result.config);
      result.config.should.have.keys(
        ['id', 'controller', 'sequence', 'hmac', 'keyAgreementKey']);
    });
    it('should fail due to duplicate config', async () => {
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      await edvs.insert({config});

      // insert same config again
      let error;
      try {
        await edvs.insert({config});
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
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      const record = await edvs.insert({config});

      // then update config w/o updating sequence
      let error;
      try {
        await edvs.update({config: record.config});
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
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      let error;
      try {
        await edvs.update({config});
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
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      const record = await edvs.insert({config});

      // then update config
      const newConfig = {...record.config};
      newConfig.sequence++;
      const result = await edvs.update({config: newConfig});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['_id', '_rev', 'config']);
      should.exist(result.config);
      result.config.should.have.keys(
        ['id', 'controller', 'sequence', 'hmac', 'keyAgreementKey']);
    });
  });

  describe('get', () => {
    it('should fail "id" assertion', async () => {
      let error;
      try {
        await edvs.get({id: false});
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
        await edvs.get({id: 'not found'});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('NotFoundError');
      error.message.should.equal('Configuration not found.');
    });
    it('should pass', async () => {
      // first insert config
      const config = {
        ...mock.config,
        id: await generateLocalId()
      };
      const inserted = await edvs.insert({config});

      // then get config
      const record = await edvs.get({id: config.id});
      record.should.eql(inserted);
    });
  });
});
