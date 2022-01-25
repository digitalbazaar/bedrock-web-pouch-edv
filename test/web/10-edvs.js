/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {initialize, edvs, generateLocalId} from 'bedrock-web-pouch-edv';
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
  });
});
