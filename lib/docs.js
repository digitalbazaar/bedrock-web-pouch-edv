/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from './assert.js';
import {parseLocalId} from './helpers.js';
import {PouchDB} from './pouchdb.js';

const COLLECTION_NAME = 'edv-storage-doc';

let _client;

export async function initialize() {
  _client = new PouchDB(COLLECTION_NAME, {auto_compaction: true});

  // queries by ID (and should be unique)
  await _client.createIndex({
    index: {
      fields: ['localEdvId', 'doc.id']
    }
  });

  // attribute-based queries
  await _client.createIndex({
    index: {
      name: 'attributes',
      fields: [
        'localEdvId',
        'doc.indexed.hmac.id',
        'doc.indexed.attributes.name',
        'doc.indexed.attributes.value'
      ],
      partial_filter_selector: {
        'doc.indexed': {$exists: true},
        'doc.indexed.hmac.id': {$exists: true},
        'doc.indexed.attributes.name': {$exists: true}
      }
    }
  });

  // used to enforce uniqueness on insert / update
  await _client.createIndex({
    index: {
      name: 'attributes.unique',
      fields: [
        'localEdvId',
        'uniqueAttributes'
      ],
      partial_filter_selector: {
        uniqueAttributes: {$exists: true}
      }
    }
  });
}

/**
 * Inserts an EDV document.
 *
 * @param {object} options - The options to use.
 * @param {string} options.edvId - The ID of the EDV to store the document in.
 * @param {object} options.doc - The document to insert.
 *
 * @returns {Promise<object>} Resolves to the database record.
 */
export async function insert({edvId, doc} = {}) {
  assert.string(edvId, 'edvId');
  assert.doc(doc);

  // create record
  const {record, uniqueConstraints} = _createRecord({edvId, doc});

  // insert and return updated record
  const result = await _client.insertOne({doc: record, uniqueConstraints});
  return result.record;
}

/**
 * Updates (replaces) an EDV document. If the document does not exist, it will
 * be inserted.
 *
 * @param {object} options - The options to use.
 * @param {string} options.edvId - The ID of the EDV to store the document in.
 * @param {object} options.doc - The document to store.
 *
 * @returns {Promise} Resolves once the operation completes.
 */
export async function upsert({edvId, doc} = {}) {
  assert.string(edvId, 'edvId');
  assert.doc(doc);

  // create record
  const {localEdvId, record, uniqueConstraints} = _createRecord({edvId, doc});

  const result = await _client.updateOne({
    doc: record,
    query: {
      selector: {
        localEdvId,
        'doc.id': doc.id,
        'doc.sequence': doc.sequence - 1
      }
    },
    upsert: true,
    uniqueConstraints
  });
  if(!result) {
    const error = new Error(
      'Could not update document. Sequence does not match.');
    error.name = 'InvalidStateError';
    throw error;
  }
}

/**
 * Gets an EDV document.
 *
 * @param {object} options - The options to use.
 * @param {string} options.edvId - The ID of the EDV.
 * @param {string} options.id - The ID of the document.
 *
 * @returns {Promise<object>} Resolves to the database record.
 */
export async function get({edvId, id} = {}) {
  assert.string(edvId, 'edvId');
  assert.localId(id, 'id');

  const {localId: localEdvId} = parseLocalId({id: edvId});
  const [{docs: [record]}] = await _client.find({
    selector: {localEdvId, 'doc.id': id},
    limit: 1
  });
  if(!record) {
    const error = new Error('Document not found.');
    error.name = 'NotFoundError';
    throw error;
  }
  return record;
}

/**
 * Retrieves all EDV documents matching the given query.
 *
 * @param {object} options - The options to use.
 * @param {string} options.edvId - The ID of the EDV.
 * @param {object} [options.query={}] - The query to use with `selector` and
 *   `options`, etc.
 *
 * @returns {Promise<Array>} Resolves with the records that matched the query.
 */
export async function find({edvId, query = {selector: {}}}) {
  assert.object(query);
  assert.object(query.selector);

  // force local EDV ID to be in query
  const {localId: localEdvId} = parseLocalId({id: edvId});
  query = {...query};
  const selector = {localEdvId, ...query.selector};

  // if query involves encrypted attributes, the `attributes` index must
  // be specified
  let use_index;
  for(const key in selector) {
    if(key.startsWith('doc.indexed.')) {
      use_index = 'attributes';
    }
  }

  const {docs: records} = await _client.find({
    selector,
    use_index,
    ...query.options
  });
  return {records};
}

function _createRecord({edvId, doc}) {
  const {localId: localEdvId} = parseLocalId({id: edvId});
  const record = {localEdvId, doc};

  // build top-level unique index field
  const uniqueConstraints = [{
    selector: {localEdvId, 'doc.id': doc.id}
  }];
  const uniqueAttributes = _buildUniqueAttributesIndex({doc});
  if(uniqueAttributes.length > 0) {
    record.uniqueAttributes = uniqueAttributes;
    uniqueConstraints.push({
      selector: {localEdvId, $in: uniqueAttributes},
      options: {use_index: 'attributes.unique'}
    });
  }

  return {localEdvId, record, uniqueConstraints};
}

function _buildUniqueAttributesIndex({doc}) {
  const uniqueAttributes = [];

  // build top-level unique index field
  if(doc.indexed) {
    for(const entry of doc.indexed) {
      const encodedHmacId = encodeURIComponent(entry.hmac.id);
      const attributes = entry.attributes || [];
      for(const attribute of attributes) {
        if(attribute.unique) {
          // concat hash of hmac ID, name, and value for unique indexing
          uniqueAttributes.push(
            `${encodedHmacId}:${attribute.name}:${attribute.value}`);
        }
      }
    }
  }

  return uniqueAttributes;
}
