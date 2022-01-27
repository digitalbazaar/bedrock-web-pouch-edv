/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from './assert.js';
import {get as getDoc} from './docs.js';
import {parseLocalId} from './helpers.js';
import {PouchDB} from './pouchdb.js';

const COLLECTION_NAME = 'edv-storage-chunk';

let _client;

/**
 * Initializes the encrypted document chunks database.
 *
 * @returns {Promise} Settles once the operation completes.
 */
export async function initialize() {
  _client = new PouchDB(COLLECTION_NAME, {auto_compaction: true});

  // Note: `_id` is populated using the combination of `localEdvId`,
  // `docId` and `chunk.index` and serves as the primary unique index for
  // this collection
}

/**
 * Updates (replaces) an EDV document chunk. If the document chunk does not
 * exist, it will be inserted.
 *
 * @param {object} options - The options to use.
 * @param {string} options.edvId - The ID of the EDV to store the chunk in.
 * @param {string} options.docId - The ID of the document the chunk is
 *   associated with.
 * @param {object} options.chunk - The chunk to store.
 *
 * @returns {Promise<object>} Resolves to the database record.
 */
export async function upsert({edvId, docId, chunk} = {}) {
  assert.string(edvId, 'edvId');
  assert.localId(docId, 'docId');
  assert.chunk(chunk);

  // TODO: implement garbage collector worker that removes chunks with stale
  // sequences (e.g., can happen because uploads failed or because associated
  // data shrunk in size, i.e., fewer chunks)

  // ensure `chunk.sequence` is proper (on par with associated doc)
  // TODO: optimize retrieval of only sequence number
  const {doc} = await getDoc({edvId, id: docId});
  if(chunk.sequence !== doc.sequence) {
    const error = new Error(
      'Could not update document chunk. Sequence does not match the ' +
      'associated document.');
    error.name = 'InvalidStateError';
    error.expected = doc.sequence;
    error.actual = chunk.sequence;
    throw error;
  }

  // create record
  const {localId: localEdvId} = parseLocalId({id: edvId});
  const _id = _createId({localEdvId, docId, index: chunk.index});
  const record = {_id, localEdvId, docId, chunk};

  let result;
  try {
    result = await _client.updateOne({
      doc: record,
      query: {
        selector: {_id}
      },
      upsert: true
    });
  } catch(e) {
    if(e.name === 'ConstraintError') {
      // if the error was with the same document, then the same chunk was
      // upserted concurrently -- and we treat this one as if it succeeded
      // but was overwritten by whatever is in the database now
      if(e.existing._id === _id) {
        return e.existing;
      }
    }
    throw e;
  }
  return result.record;
}

/**
 * Gets an EDV document chunk.
 *
 * @param {object} options - The options to use.
 * @param {string} options.edvId - The ID of the EDV.
 * @param {string} options.docId - The ID of the document the chunk is
 *   associated with.
 * @param {number} options.index - The index of the chunk.
 *
 * @returns {Promise<object>} Resolves to the database record.
 */
export async function get({edvId, docId, index} = {}) {
  assert.string(edvId, 'edvId');
  assert.localId(docId, 'docId');
  assert.nonNegativeSafeInteger(index, 'index');

  const {localId: localEdvId} = parseLocalId({id: edvId});
  const {docs: [record]} = await _client.find({
    selector: {_id: _createId({localEdvId, docId, index})},
    limit: 1
  });
  if(!record) {
    const error = new Error('Document chunk not found.');
    error.name = 'NotFoundError';
    throw error;
  }
  return record;
}

/**
 * Removes an EDV document chunk.
 *
 * @param {object} options - The options to use.
 * @param {string} options.edvId - The ID of the EDV.
 * @param {string} options.docId - The ID of the document the chunk is
 *   associated with.
 * @param {number} options.index - The index of the chunk.
 *
 * @returns {Promise<boolean>} `true` if the chunk was removed, `false` if it
 *   was not found.
 */
export async function remove({edvId, docId, index} = {}) {
  // sadly, this is non-atomic because PouchDB does not offer the necessary
  // primitives
  let record;
  try {
    record = await get({edvId, docId, index});
  } catch(e) {
    if(e.name === 'NotFoundError') {
      return false;
    }
  }

  // delete record
  record._deleted = true;
  await _client.put(record);
  return true;
}

function _createId({localEdvId, docId, index}) {
  return `${localEdvId}:${docId}:${index}`;
}
