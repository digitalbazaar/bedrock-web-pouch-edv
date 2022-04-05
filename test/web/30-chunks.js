/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {
  chunks, docs, edvs, generateLocalId, initialize
} from '@bedrock/web-pouch-edv';
import {mock} from './mock.js';

describe('chunks API', function() {
  let edvId;
  let docId;
  before(async () => {
    await initialize();
  });
  beforeEach(async () => {
    const config = {
      ...mock.config,
      id: await generateLocalId()
    };
    const configRecord = await edvs.insert({config});
    edvId = configRecord.config.id;

    const doc = {
      ...mock.doc,
      id: await generateLocalId()
    };
    const docRecord = await docs.insert({edvId, doc});
    docId = docRecord.doc.id;
  });

  describe('upsert', () => {
    it('should fail "edvId" assertion', async () => {
      const chunk = {
        ...mock.chunk
      };
      let error;
      try {
        await chunks.upsert({edvId: false, docId, chunk});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"edvId" must be a string.');
    });
    it('should fail "docId" assertion', async () => {
      const chunk = {
        ...mock.chunk
      };
      let error;
      try {
        await chunks.upsert({edvId, docId: false, chunk});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"docId" must be a string.');
    });
    it('should fail "chunk.sequence" assertion', async () => {
      const chunk = {
        ...mock.chunk,
        sequence: false
      };
      let error;
      try {
        await chunks.upsert({edvId, docId, chunk});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal(
        '"chunk.sequence" must be a non-negative safe integer.');
    });
    it('should fail due to bad sequence', async () => {
      // upsert chunk w/bad sequence
      const chunk = {
        ...mock.chunk,
        sequence: 1000
      };
      let error;
      try {
        await chunks.upsert({edvId, docId, chunk});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('InvalidStateError');
      error.message.should.equal(
        'Could not update document chunk. Sequence does not match the ' +
        'associated document.');
    });
    it('should pass with a new chunk', async () => {
      // upsert chunk
      const chunk = {
        ...mock.chunk
      };
      const result = await chunks.upsert({edvId, docId, chunk});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['_id', '_rev', 'localEdvId', 'docId', 'chunk']);
      should.exist(result.chunk);
      result.chunk.should.have.keys(['sequence', 'index', 'offset', 'jwe']);
    });
    it('should pass with an existing chunk', async () => {
      // first insert chunk
      const chunk = {
        ...mock.chunk
      };
      const record = await chunks.upsert({edvId, docId, chunk});

      // then update document
      const doc = {
        ...mock.doc,
        id: docId,
        sequence: 1
      };
      await docs.upsert({edvId, doc});

      // then update chunk
      const newChunk = {...record.chunk};
      newChunk.sequence++;
      const result = await chunks.upsert({edvId, docId, chunk: newChunk});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['_id', '_rev', 'localEdvId', 'docId', 'chunk']);
      should.exist(result.chunk);
      result.chunk.should.have.keys(['sequence', 'index', 'offset', 'jwe']);
    });
  });

  describe('get', () => {
    it('should fail "edvId" assertion', async () => {
      let error;
      try {
        await chunks.get({edvId: false, docId, index: 0});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"edvId" must be a string.');
    });
    it('should fail "docId" assertion', async () => {
      let error;
      try {
        await chunks.get({edvId, docId: false, index: 0});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal('"docId" must be a string.');
    });
    it('should fail "index" assertion', async () => {
      let error;
      try {
        await chunks.get({edvId, docId, index: false});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('TypeError');
      error.message.should.equal(
        '"index" must be a non-negative safe integer.');
    });
    it('should fail due to not found error', async () => {
      // get non-existent chunk
      let error;
      try {
        await chunks.get({edvId, docId, index: 0});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('NotFoundError');
      error.message.should.equal('Document chunk not found.');
    });
    it('should fail due to not found error (wrong EDV)', async () => {
      // first insert chunk
      const chunk = {
        ...mock.chunk
      };
      await chunks.upsert({edvId, docId, chunk});

      // try to get chunk with wrong EDV ID
      let error;
      try {
        const wrongEdvId = 'z19pjdSMQMkBqqJ5zsbbgbbbb';
        await chunks.get({edvId: wrongEdvId, docId, index: chunk.index});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('NotFoundError');
      error.message.should.equal('Document chunk not found.');
    });
    it('should fail due to not found error (wrong doc)', async () => {
      // first insert chunk
      const chunk = {
        ...mock.chunk
      };
      await chunks.upsert({edvId, docId, chunk});

      // try to get chunk with wrong doc ID
      let error;
      try {
        const wrongDocId = 'z19pjdSMQMkBqqJ5zsbbgbbbb';
        await chunks.get({edvId, docId: wrongDocId, index: chunk.index});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('NotFoundError');
      error.message.should.equal('Document chunk not found.');
    });
    it('should pass', async () => {
      // first insert chunk
      const chunk = {
        ...mock.chunk
      };
      const inserted = await chunks.upsert({edvId, docId, chunk});

      // then get chunk
      const record = await chunks.get({edvId, docId, index: chunk.index});
      record.should.eql(inserted);
    });
  });
});
