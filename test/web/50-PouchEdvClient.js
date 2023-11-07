/*!
 * Copyright (c) 2022-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {
  generateLocalId, initialize, PouchEdvClient, secrets
} from '@bedrock/web-pouch-edv';
import {mock} from './mock.js';

const cipherVersions = ['recommended', 'fips'];

describe('PouchEdvClient API', function() {
  before(async () => {
    await initialize();
  });

  cipherVersions.forEach(cipherVersion => {
    describe(`"${cipherVersion}" cipher version`, () => {
      describe('createEdv', () => {
        it('should fail with both password and keys specified', async () => {
          const password = 'pw';
          const config = {
            ...mock.config,
            id: await generateLocalId()
          };
          let error;
          try {
            await PouchEdvClient.createEdv({config, password, cipherVersion});
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
          const result = await PouchEdvClient.createEdv(
            {config, cipherVersion});
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
          const result = await PouchEdvClient.createEdv(
            {config, password, cipherVersion});
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

          // generate secret to simulate creating an EDV where secret
          // generation is successful but a failure occurs before the EDV
          // config is inserted allowing continuation of this process provided
          // the password matches
          const {config: secretConfig} = await secrets.generate({
            id: config.id, password
          });
          await secrets.insert({config: secretConfig});

          const result = await PouchEdvClient.createEdv(
            {config, password, cipherVersion});
          should.exist(result);
          result.should.be.an('object');
          result.should.have.keys(['config', 'edvClient']);
          should.exist(result.edvClient);
          should.exist(result.config);
          result.config.should.have.keys(
            ['id', 'controller', 'sequence', 'hmac', 'keyAgreementKey']);
        });
        it('should fail with pregenerated secret + invalid password',
          async () => {
            const password = 'pw';
            const config = {
              ...mock.config,
              id: await generateLocalId()
            };
            delete config.hmac;
            delete config.keyAgreementKey;

            // generate secret to simulate creating an EDV where secret
            // generation is successful but a failure occurs before the EDV
            // config is inserted allowing continuation of this process
            // provided the password matches
            const {config: secretConfig} = await secrets.generate({
              id: config.id, password, cipherVersion
            });
            await secrets.insert({config: secretConfig});

            let error;
            try {
              await PouchEdvClient.createEdv(
                {config, password: 'invalid', cipherVersion});
            } catch(e) {
              error = e;
            }
            should.exist(error);
            error.name.should.equal('Error');
            error.message.should.equal(
              `Secret already exists for EDV ID (${config.id}) but password ` +
              'to unlock it is invalid.');
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
          await PouchEdvClient.createEdv({config, password, cipherVersion});

          // now try again
          let error;
          try {
            await PouchEdvClient.createEdv({config, password, cipherVersion});
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
          await PouchEdvClient.createEdv({config, password, cipherVersion});

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
          await PouchEdvClient.createEdv({config, password, cipherVersion});

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
          const result = await PouchEdvClient.createEdv(
            {config, password, cipherVersion});
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
          const result = await PouchEdvClient.createEdv(
            {config, password, cipherVersion});
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
        it('should fail due to duplicate unique attribute', async () => {
          await edvClient.ensureIndex({attribute: 'content.id', unique: true});

          const doc = {
            id: await generateLocalId(),
            content: {id: 'foo'}
          };
          await edvClient.update({doc});

          // upsert different doc with same attribute
          const doc2 = {
            id: await generateLocalId(),
            content: {id: 'foo'}
          };
          let error;
          try {
            await edvClient.update({doc: doc2});
          } catch(e) {
            error = e;
          }
          should.exist(error);
          error.name.should.equal('DuplicateError');
        });
        it('should pass with non-conflicting attribute', async () => {
          await edvClient.ensureIndex({attribute: 'content.id', unique: true});

          const doc = {
            id: await generateLocalId(),
            content: {id: 'foo', bar: 'baz'}
          };
          const inserted1 = await edvClient.update({doc});

          // upsert different doc with different value for unique attributes
          // but same value for non-unique attribute (should be legal)
          const doc2 = {
            id: await generateLocalId(),
            content: {id: 'different', bar: 'baz'}
          };
          const inserted2 = await edvClient.update({doc: doc2});

          const getDoc1 = await edvClient.get({id: doc.id});
          getDoc1.should.eql(inserted1);
          const getDoc2 = await edvClient.get({id: doc2.id});
          getDoc2.should.eql(inserted2);
        });
        it('should fail due to change to duplicate unique attribute',
          async () => {
            await edvClient.ensureIndex(
              {attribute: 'content.id', unique: true});

            const doc = {
              id: await generateLocalId(),
              content: {id: 'foo', bar: 'baz'}
            };
            await edvClient.update({doc});

            // upsert different doc with different value for unique attributes
            // but same value for non-unique attribute (should be legal)
            let doc2 = {
              id: await generateLocalId(),
              content: {id: 'different', bar: 'baz'}
            };
            await edvClient.update({doc: doc2});

            // now should fail when trying to change `doc2` to have the same
            // unique attribute as `doc1`
            doc2 = {
              id: doc2.id,
              content: {...doc.content},
              sequence: 1
            };
            let error;
            try {
              await edvClient.update({doc: doc2});
            } catch(e) {
              error = e;
            }
            should.exist(error);
            error.name.should.equal('DuplicateError');
          });
      });

      describe('find', () => {
        let edvClient;
        beforeEach(async () => {
          const password = 'pw';
          const config = {
            ...mock.config,
            id: await generateLocalId()
          };
          delete config.hmac;
          delete config.keyAgreementKey;
          const result = await PouchEdvClient.createEdv(
            {config, password, cipherVersion});
          edvClient = result.edvClient;
        });
        it('should get a document by attribute', async () => {
          await edvClient.ensureIndex({attribute: 'content.foo'});

          // first insert doc
          const doc = {
            id: await generateLocalId(),
            content: {foo: 'bar'}
          };
          const inserted = await edvClient.insert({doc});

          // then find doc
          const result = await edvClient.find({has: 'content.foo'});
          should.exist(result);
          result.should.be.an('object');
          result.should.have.keys(['documents']);
          should.exist(result.documents);
          result.documents.should.be.an('array');
          result.documents.length.should.equal(1);
          should.exist(result.documents[0]);
          result.documents[0].should.eql(inserted);
        });
        it('should get a document by attribute and value', async () => {
          await edvClient.ensureIndex({attribute: 'content.foo'});

          // first insert doc
          const doc = {
            id: await generateLocalId(),
            content: {foo: 'bar'}
          };
          const inserted = await edvClient.insert({doc});

          // then find doc
          const result = await edvClient.find({equals: {'content.foo': 'bar'}});
          should.exist(result);
          result.should.be.an('object');
          result.should.have.keys(['documents']);
          should.exist(result.documents);
          result.documents.should.be.an('array');
          result.documents.length.should.equal(1);
          should.exist(result.documents[0]);
          result.documents[0].should.eql(inserted);
        });
        it('should get documents by attribute and value', async () => {
          await edvClient.ensureIndex({attribute: 'content.foo'});

          // insert 3 docs, each with different attribute values, find only 2
          const doc1 = {
            id: await generateLocalId(),
            content: {foo: 'bar'}
          };
          await edvClient.insert({doc: doc1});

          const doc2 = {
            id: await generateLocalId(),
            content: {foo: 'bar'}
          };
          await edvClient.insert({doc: doc2});

          const doc3 = {
            id: await generateLocalId(),
            content: {foo: 'different'}
          };
          await edvClient.insert({doc: doc3});

          // then find 2 docs out of 3
          const result = await edvClient.find({equals: {'content.foo': 'bar'}});
          should.exist(result);
          result.should.be.an('object');
          result.should.have.keys(['documents']);
          should.exist(result.documents);
          result.documents.should.be.an('array');
          result.documents.length.should.equal(2);
          result.documents.map(({id}) => id).should.include.members([
            doc1.id, doc2.id
          ]);
        });
        it('should get documents w/limit', async () => {
          await edvClient.ensureIndex({attribute: 'content.foo'});

          const doc1 = {
            id: await generateLocalId(),
            content: {foo: 'bar'}
          };
          await edvClient.insert({doc: doc1});

          const doc2 = {
            id: await generateLocalId(),
            content: {foo: 'bar'}
          };
          await edvClient.insert({doc: doc2});

          // limit results to just 1 of the 2 docs
          const result = await edvClient.find({
            equals: {'content.foo': 'bar'},
            limit: 1
          });
          should.exist(result);
          result.should.be.an('object');
          result.should.have.keys(['documents', 'hasMore']);
          should.exist(result.documents);
          result.documents.should.be.an('array');
          result.documents.length.should.equal(1);
          should.exist(result.hasMore);
          result.hasMore.should.equal(true);
        });
        it('should get documents w/limit and hasMore=false', async () => {
          await edvClient.ensureIndex({attribute: 'content.foo'});

          const doc1 = {
            id: await generateLocalId(),
            content: {foo: 'bar'}
          };
          await edvClient.insert({doc: doc1});

          const doc2 = {
            id: await generateLocalId(),
            content: {foo: 'bar'}
          };
          await edvClient.insert({doc: doc2});

          // limit results to just 1 of the 2 docs
          const result = await edvClient.find({
            equals: {'content.foo': 'bar'},
            limit: 2
          });
          should.exist(result);
          result.should.be.an('object');
          result.should.have.keys(['documents', 'hasMore']);
          should.exist(result.documents);
          result.documents.should.be.an('array');
          result.documents.length.should.equal(2);
          result.documents.map(({id}) => id).should.include.members([
            doc1.id, doc2.id
          ]);
          should.exist(result.hasMore);
          result.hasMore.should.equal(false);
        });
        it('should get no documents', async () => {
          await edvClient.ensureIndex({attribute: 'content.foo'});

          // insert 3 docs, each with different attribute values, find none
          const doc1 = {
            id: await generateLocalId(),
            content: {foo: 'bar'}
          };
          await edvClient.insert({doc: doc1});

          const doc2 = {
            id: await generateLocalId(),
            content: {foo: 'bar'}
          };
          await edvClient.insert({doc: doc2});

          const doc3 = {
            id: await generateLocalId(),
            content: {foo: 'different'}
          };
          await edvClient.insert({doc: doc3});

          // then find no matching docs
          const result = await edvClient.find({
            equals: {'content.foo': 'nomatches'}
          });
          should.exist(result);
          result.should.be.an('object');
          result.should.have.keys(['documents']);
          should.exist(result.documents);
          result.documents.should.be.an('array');
          result.documents.length.should.equal(0);
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
          const result = await PouchEdvClient.createEdv(
            {config, password, cipherVersion});
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
          const result = await PouchEdvClient.createEdv(
            {config, password, cipherVersion});
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
  });
});
