/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from './assert.js';
import {createDatabase} from './pouchdb.js';
import {parseLocalId} from './helpers.js';

const COLLECTION_NAME = 'edv-storage-doc';

let _client;

/**
 * Initializes the encrypted documents database if it has not already
 * been initialized.
 *
 * @returns {Promise} Settles once the operation completes.
 */
export async function initialize() {
  if(_client) {
    // already initialized
    return;
  }

  _client = await createDatabase({name: COLLECTION_NAME});

  /* Note: `_id` is populated using the combination of `localEdvId` and
  `doc.id` and serves as the primary unique index for this collection.

  Additionally, index information from each encrypted document is massaged to
  work within the limitations of PouchDB's indexing system. For example, since
  PouchDB does not support deep referencing fields within arrays (only within
  objects), the `doc.indexed` array must be transformed to enable indexing
  here. That array is transformed into three different arrays that are stored
  at the top level of each record in the database:

  `attributes` - Holds the names and values of every encrypted attribute and
    value pair, enabling queries that check full attributes to be checked.

  `attributeNames` - Holds the names of every encrypted attribute so that
    queries that just check for the presence of attributes (but not their
    values) can be performed.

  `uniqueAttributes` - Holds the names and values of every encrypted attribute
    that is marked as `unique`. This allows unique constraints to be applied
    to encrypted attributes.
  */

  // attribute name + value queries
  await _client.createIndex({
    index: {
      ddoc: 'edv-doc',
      name: 'attributes',
      fields: [
        'localEdvId',
        'attributes'
      ],
      partial_filter_selector: {
        attributes: {$exists: true}
      }
    }
  });

  // attribute name queries
  await _client.createIndex({
    index: {
      ddoc: 'edv-doc',
      name: 'attributes.name',
      fields: [
        'localEdvId',
        'attributeNames'
      ],
      partial_filter_selector: {
        attributeNames: {$exists: true}
      }
    }
  });

  // used to enforce uniqueness on insert / update
  await _client.createIndex({
    index: {
      ddoc: 'edv-doc',
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
 * @param {boolean} [options.deleted=false] - Set to `true` if the EDV
 *   document is a tombstone, i.e., it has been deleted.
 *
 * @returns {Promise<object>} Resolves to the database record.
 */
export async function upsert({edvId, doc, deleted = false} = {}) {
  assert.string(edvId, 'edvId');
  assert.doc(doc);

  // create record
  const {localEdvId, record, uniqueConstraints} = _createRecord({edvId, doc});
  const _id = _createId({localEdvId, docId: doc.id});

  if(deleted) {
    // mark record as deleted; important to improve pouchdb indexing speed
    record._deleted = true;
  }

  let result;
  try {
    result = await _client.updateOne({
      doc: record,
      query: {
        selector: {
          _id,
          'doc.sequence': doc.sequence - 1
        }
      },
      upsert: true,
      uniqueConstraints
    });
  } catch(e) {
    if(e.name === 'ConstraintError') {
      // if the error was with the same document, then the sequence did not
      // match
      if(e.existing._id === _id) {
        const error = new Error(
          'Could not update document. Sequence does not match.');
        error.name = 'InvalidStateError';
        throw error;
      }
    }
    throw e;
  }
  return result.record;
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
  const {docs: [record]} = await _client.find({
    selector: {_id: _createId({localEdvId, docId: id})},
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

  // force local EDV ID to be in query if not present
  let {selector} = query;
  if(!selector.localEdvId) {
    const {localId: localEdvId} = parseLocalId({id: edvId});
    selector = {localEdvId, ...selector};
  }

  const {docs: records} = await _client.find({
    selector,
    ...query.options
  });
  return {records};
}

/**
 * Creates a query to pass to `find` based on the given `edvQuery`. The
 * `edvQuery` can have these properties: `{index, equals, has, count, limit}`.
 * The `index` property must be given and include an hmac ID associated with an
 * encrypted index and only one of `equals` or `has` must be given.
 *
 * @param {object} options - The options to use.
 * @param {string} options.edvId - The ID of the EDV.
 * @param {object} options.edvQuery - The EDV query.
 *
 * @returns {Promise<object>} Resolves to a `query` to pass to `find`.
 */
export function createQuery({edvId, edvQuery} = {}) {
  assert.string(edvId, 'edvId');
  assert.edvQuery(edvQuery, 'edvQuery');

  const use_index = ['edv-doc'];
  const {index, equals, has} = edvQuery;
  const encodedIndex = encodeURIComponent(index);
  const {localId: localEdvId} = parseLocalId({id: edvId});
  const selector = {localEdvId};
  if(equals) {
    // must provide this to enable use of the attributes query; the PouchDB
    // query planner needs it to determine start / end keys in the index
    selector.attributes = {$gt: null};
    selector.$or = equals.map(e => ({
      attributes: {
        $all: Object.entries(e).map(([name, value]) =>
          `${encodedIndex}:${encodeURIComponent(name)}:` +
          `${encodeURIComponent(value)}`)
      }
    }));
    use_index.push('attributes');
  } else {
    // `has` query
    selector.attributeNames = {
      $all: has.map(name => `${encodedIndex}:${encodeURIComponent(name)}`)
    };
    use_index.push('attributes.name');
  }
  return {selector, options: {use_index}};
}

function _createRecord({edvId, doc}) {
  const {localId: localEdvId} = parseLocalId({id: edvId});
  const _id = _createId({localEdvId, docId: doc.id});
  const record = {_id, localEdvId, doc};

  // build top-level attribute index fields
  const {
    attributes, attributeNames, uniqueAttributes
  } = _buildAttributesIndex({doc});

  if(attributes.length > 0) {
    record.attributes = attributes;
  }

  if(attributeNames.length > 0) {
    record.attributeNames = attributeNames;
  }

  const uniqueConstraints = [];
  if(uniqueAttributes.length > 0) {
    record.uniqueAttributes = uniqueAttributes;
    uniqueConstraints.push({
      selector: {localEdvId, uniqueAttributes: {$in: uniqueAttributes}},
      options: {use_index: ['edv-doc', 'attributes.unique']}
    });
  }

  return {localEdvId, record, uniqueConstraints};
}

function _buildAttributesIndex({doc}) {
  const attributes = [];
  const attributeNames = [];
  const uniqueAttributes = [];

  // build top-level index fields
  if(doc.indexed) {
    for(const entry of doc.indexed) {
      if(!entry.attributes) {
        continue;
      }
      const encodedHmacId = encodeURIComponent(entry.hmac.id);
      for(const attribute of entry.attributes) {
        // concat hash of hmac ID, name, and value
        const name = `${encodedHmacId}:${encodeURIComponent(attribute.name)}`;
        const full = `${name}:${encodeURIComponent(attribute.value)}`;
        attributes.push(full);
        attributeNames.push(name);
        if(attribute.unique) {
          uniqueAttributes.push(full);
        }
      }
    }
  }

  return {attributes, attributeNames, uniqueAttributes};
}

function _createId({localEdvId, docId}) {
  return `${localEdvId}:${docId}`;
}
