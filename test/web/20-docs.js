/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {docs, edvs, generateLocalId, initialize} from 'bedrock-web-pouch-edv';
import {mock} from './mock.js';

describe('docs API', function() {
  let edvId;
  before(async () => {
    await initialize();
  });
  beforeEach(async () => {
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
    it('should fail due to duplicate doc ID', async () => {
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
    it('should fail due to duplicate unique attribute', async () => {
      const doc = {
        ...mock.docWithUniqueAttributes,
        id: await generateLocalId()
      };
      await docs.insert({edvId, doc});

      // insert different doc with same attribute
      const doc2 = {
        ...mock.docWithUniqueAttributes,
        id: await generateLocalId()
      };
      let error;
      try {
        await docs.insert({edvId, doc: doc2});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('ConstraintError');
      error.message.should.equal(
        'Could not insert document; uniqueness constraint violation.');
    });
    it('should pass with non-conflicting attribute', async () => {
      const doc = {
        ...mock.docWithUniqueAttributes,
        id: await generateLocalId()
      };
      const inserted1 = await docs.insert({edvId, doc});

      // insert different doc with different value for unique attributes
      // but same value for non-unique attribute (should be legal)
      const doc2 = {
        ...mock.docWithUniqueAttributes2,
        id: await generateLocalId()
      };
      const inserted2 = await docs.insert({edvId, doc: doc2});

      const record1 = await docs.get({edvId, id: doc.id});
      record1.should.eql(inserted1);
      const record2 = await docs.get({edvId, id: doc2.id});
      record2.should.eql(inserted2);
    });
  });

  describe('upsert', () => {
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
    it('should fail due to duplicate unique attribute', async () => {
      const doc = {
        ...mock.docWithUniqueAttributes,
        id: await generateLocalId()
      };
      await docs.upsert({edvId, doc});

      // upsert different doc with same attribute
      const doc2 = {
        ...mock.docWithUniqueAttributes,
        id: await generateLocalId()
      };
      let error;
      try {
        await docs.upsert({edvId, doc: doc2});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('ConstraintError');
      error.message.should.equal(
        'Could not insert document; uniqueness constraint violation.');
    });
    it('should pass with non-conflicting attribute', async () => {
      const doc = {
        ...mock.docWithUniqueAttributes,
        id: await generateLocalId()
      };
      const inserted1 = await docs.upsert({edvId, doc});

      // upsert different doc with different value for unique attributes
      // but same value for non-unique attribute (should be legal)
      const doc2 = {
        ...mock.docWithUniqueAttributes2,
        id: await generateLocalId()
      };
      const inserted2 = await docs.upsert({edvId, doc: doc2});

      const record1 = await docs.get({edvId, id: doc.id});
      record1.should.eql(inserted1);
      const record2 = await docs.get({edvId, id: doc2.id});
      record2.should.eql(inserted2);
    });
    it('should fail due to change to duplicate unique attribute', async () => {
      const doc = {
        ...mock.docWithUniqueAttributes,
        id: await generateLocalId()
      };
      await docs.upsert({edvId, doc});

      // upsert different doc with different value for unique attributes
      // but same value for non-unique attribute (should be legal)
      let doc2 = {
        ...mock.docWithUniqueAttributes2,
        id: await generateLocalId()
      };
      await docs.upsert({edvId, doc: doc2});

      // now should fail when trying to change `doc2` to have the same
      // unique attribute as `doc1`
      doc2 = {
        ...mock.docWithUniqueAttributes,
        id: doc2.id,
        sequence: 1
      };
      let error;
      try {
        await docs.upsert({edvId, doc: doc2});
      } catch(e) {
        error = e;
      }
      should.exist(error);
      error.name.should.equal('ConstraintError');
      error.message.should.equal(
        'Could not update document; uniqueness constraint violation.');
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
      // get non-existent doc
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

  describe('find', () => {
    it('should get a document by attribute', async () => {
      // first insert doc
      const doc = {
        ...mock.docWithAttributes,
        id: await generateLocalId()
      };
      const inserted = await docs.insert({edvId, doc});

      // then find doc
      const entry = doc.indexed[0];
      const [attribute] = entry.attributes;
      const query = docs.createQuery({
        edvId,
        edvQuery: {
          index: entry.hmac.id,
          has: [attribute.name]
        }
      });
      const result = await docs.find({edvId, query});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['records']);
      should.exist(result.records);
      result.records.should.be.an('array');
      result.records.length.should.equal(1);
      should.exist(result.records[0]);
      result.records[0].should.eql(inserted);
    });
    it('should get a document by attribute and value', async () => {
      // first insert doc
      const doc = {
        ...mock.docWithAttributes,
        id: await generateLocalId()
      };
      const inserted = await docs.insert({edvId, doc});

      // then find doc
      const entry = doc.indexed[0];
      const [attribute] = entry.attributes;
      const query = docs.createQuery({
        edvId,
        edvQuery: {
          index: entry.hmac.id,
          equals: [{[attribute.name]: attribute.value}]
        }
      });
      const result = await docs.find({edvId, query});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['records']);
      should.exist(result.records);
      result.records.should.be.an('array');
      result.records.length.should.equal(1);
      should.exist(result.records[0]);
      result.records[0].should.eql(inserted);
    });
    it('should get documents by attribute and value', async () => {
      // insert 3 docs, each with different attribute values, find only 2
      const doc1 = {
        ...mock.docWithAttributes,
        id: await generateLocalId()
      };
      await docs.insert({edvId, doc: doc1});

      // must deep copy to change attributes
      const doc2 = JSON.parse(JSON.stringify(mock.docWithAttributes));
      doc2.id = await generateLocalId();
      doc2.indexed[0].attributes[0].value = 'match';
      await docs.insert({edvId, doc: doc2});

      // must deep copy to change attributes
      const doc3 = JSON.parse(JSON.stringify(mock.docWithAttributes));
      doc3.id = await generateLocalId();
      doc3.indexed[0].attributes[0].value = 'different';
      await docs.insert({edvId, doc: doc3});

      // then find 2 docs out of 3
      const entry = doc1.indexed[0];
      const [attribute] = entry.attributes;
      const query = docs.createQuery({
        edvId,
        edvQuery: {
          index: entry.hmac.id,
          equals: [
            {[attribute.name]: attribute.value},
            {[attribute.name]: doc2.indexed[0].attributes[0].value}
          ]
        }
      });
      const result = await docs.find({edvId, query});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['records']);
      should.exist(result.records);
      result.records.should.be.an('array');
      result.records.length.should.equal(2);
      result.records.map(({doc: {id}}) => id).should.include.members([
        doc1.id, doc2.id
      ]);
    });
    it('should get no documents', async () => {
      // insert 3 docs, each with different attribute values, find none
      const doc1 = {
        ...mock.docWithAttributes,
        id: await generateLocalId()
      };
      await docs.insert({edvId, doc: doc1});

      // must deep copy to change attributes
      const doc2 = JSON.parse(JSON.stringify(mock.docWithAttributes));
      doc2.id = await generateLocalId();
      doc2.indexed[0].attributes[0].value = 'match';
      await docs.insert({edvId, doc: doc2});

      // must deep copy to change attributes
      const doc3 = JSON.parse(JSON.stringify(mock.docWithAttributes));
      doc3.id = await generateLocalId();
      doc3.indexed[0].attributes[0].value = 'different';
      await docs.insert({edvId, doc: doc3});

      // then find no matching docs
      const entry = doc1.indexed[0];
      const [attribute] = entry.attributes;
      const query = docs.createQuery({
        edvId,
        edvQuery: {
          index: entry.hmac.id,
          equals: [
            {[attribute.name]: 'nomatches'}
          ]
        }
      });
      const result = await docs.find({edvId, query});
      should.exist(result);
      result.should.be.an('object');
      result.should.have.keys(['records']);
      should.exist(result.records);
      result.records.should.be.an('array');
      result.records.length.should.equal(0);
    });
  });
});
