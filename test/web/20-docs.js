/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {initialize, edvs, docs, generateLocalId} from 'bedrock-web-pouch-edv';
import {mock} from './mock.js';

describe('docs API', function() {
  let edvId;
  before(async () => {
    await initialize();
    const config = {
      ...mock.config,
      id: await generateLocalId()
    };
    const record = await edvs.insert({config});
    edvId = record.config.id;
  });
  describe('insert', () => {
    it('should fail "edvId" assertion', async () => {
      const doc = {
        ...mock.doc,
        id: await generateLocalId()
      };
      let error;
      try {
        await docs.insert({edvId: false, doc});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"edvId" must be a string.');
    });
    it('should fail "doc.id" assertion', async () => {
      const doc = {
        ...mock.doc,
        id: false
      };
      let error;
      try {
        await docs.insert({edvId, doc});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"doc.id" must be a string.');
    });
    it('should fail "doc.sequence" assertion', async () => {
      const doc = {
        ...mock.doc,
        sequence: false
      };
      let error;
      try {
        await docs.insert({edvId, doc});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal(
        '"doc.sequence" must be a non-negative safe integer.');
    });
    it('should pass', async () => {
      const doc = {
        ...mock.doc,
        id: await generateLocalId()
      };
      const result = await docs.insert({edvId, doc});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['_id', '_rev', 'doc', 'localEdvId']);
      should.exist(result.doc);
      result.doc.should.have.keys(['id', 'sequence', 'jwe']);
    });
    it('should fail due to duplicate doc', async () => {
      const doc = {
        ...mock.doc,
        id: await generateLocalId()
      };
      await docs.insert({edvId, doc});

      // insert same doc again
      let error;
      try {
        await docs.insert({edvId, doc});
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
      // first insert doc
      const doc = {
        ...mock.doc,
        id: await generateLocalId()
      };
      const record = await docs.insert({edvId, doc});

      // then update doc w/o updating sequence
      let error;
      try {
        await docs.upsert({edvId, doc: record.doc});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('InvalidStateError');
      error.message.should.equal(
        'Could not update document. Sequence does not match.');
    });
    it('should pass with a new doc', async () => {
      // upsert doc
      const doc = {
        ...mock.doc,
        id: await generateLocalId()
      };
      const result = await docs.upsert({edvId, doc});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['_id', '_rev', 'doc', 'localEdvId']);
      should.exist(result.doc);
      result.doc.should.have.keys(['id', 'sequence', 'jwe']);
    });
    it('should pass with an existing doc', async () => {
      // first insert doc
      const doc = {
        ...mock.doc,
        id: await generateLocalId()
      };
      const record = await docs.insert({edvId, doc});

      // then update doc
      const newDoc = {...record.doc};
      newDoc.sequence++;
      const result = await docs.upsert({edvId, doc: newDoc});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['_id', '_rev', 'doc', 'localEdvId']);
      should.exist(result.doc);
      result.doc.should.have.keys(['id', 'sequence', 'jwe']);
    });
  });

  describe('get', () => {
    it('should fail "edvId" assertion', async () => {
      let error;
      try {
        await docs.get({edvId: false, id: 'z19pjdSMQMkBqqJ5zsbbgbbbb'});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"edvId" must be a string.');
    });
    it('should fail "id" assertion', async () => {
      let error;
      try {
        await docs.get({edvId, id: false});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"id" must be a string.');
    });
    it('should fail "id" assertion w/invalid formatted id', async () => {
      let error;
      try {
        await docs.get({edvId, id: 'not valid format'});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('ConstraintError');
      error.message.should.equal(
        'Identifier "not valid format" must be base58-encoded multibase, ' +
        'multihash array of 16 random bytes.');
    });
    it('should fail due to not found error', async () => {
      // get non-existent config
      let error;
      try {
        await docs.get({edvId, id: 'z19pjdSMQMkBqqJ5zsbbgbbbb'});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('NotFoundError');
      error.message.should.equal('Document not found.');
    });
    it('should fail due to not found error (wrong EDV)', async () => {
      // first insert doc
      const doc = {
        ...mock.doc,
        id: await generateLocalId()
      };
      await docs.insert({edvId, doc});

      // try to get doc with wrong EDV ID
      let error;
      try {
        const wrongEdvId = 'z19pjdSMQMkBqqJ5zsbbgbbbb';
        await docs.get({edvId: wrongEdvId, id: doc.id});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('NotFoundError');
      error.message.should.equal('Document not found.');
    });
    it('should pass', async () => {
      // first insert doc
      const doc = {
        ...mock.doc,
        id: await generateLocalId()
      };
      const inserted = await docs.insert({edvId, doc});

      // then get doc
      const record = await docs.get({edvId, id: doc.id});
      record.should.eql(inserted);
    });
  });
});
