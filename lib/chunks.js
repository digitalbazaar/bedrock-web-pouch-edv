/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from './assert.js';
import {get as getDoc} from './docs.js';
import {parseLocalId} from './helpers.js';
import {PouchDB} from './pouchdb.js';

const COLLECTION_NAME = 'edv-storage-chunk';

let _client;

export async function initialize() {
  _client = new PouchDB(COLLECTION_NAME, {auto_compaction: true});

  // queries by chunk index (and should be unique)
  await _client.createIndex({
    index: {
      fields: ['localEdvId', 'docId', 'chunk.index']
    }
  });
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
 * @returns {Promise} Resolves once the operation completes.
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
      'Could not update document chunk. Sequence does not match.');
    error.name = 'InvalidStateError';
    error.expected = doc.sequence;
    error.actual = chunk.sequence;
    throw error;
  }

  // create record
  const {localId: localEdvId} = parseLocalId({id: edvId});
  const record = {localEdvId, docId, chunk};

  const result = await _client.updateOne({
    doc: record,
    query: {
      selector: {
        localEdvId,
        docId,
        'chunk.index': chunk.index
      }
    },
    upsert: true,
    uniqueConstraints: [{
      selector: {localEdvId, docId, 'chunk.index': chunk.index}
    }]
  });
  if(!result) {
    const error = new Error(
      'Could not update document chunk. Sequence does not match the ' +
      'associated document.');
    error.name = 'InvalidStateError';
    error.expected = doc.sequence;
    throw error;
  }
}

/**
 * Gets an EDV document chunk.
 *
 * @param {object} options - The options to use.
 * @param {string} options.edvId - The ID of the EDV.
 * @param {string} options.docId - The ID of the document the chunk is
 *   associated with.
 * @param {number} options.chunkIndex - The index of the chunk.
 *
 * @returns {Promise<object>} Resolves to the database record.
 */
export async function get({edvId, docId, chunkIndex} = {}) {
  assert.string(edvId, 'edvId');
  assert.localId(docId, 'docId');
  assert.nonNegativeSafeInteger(chunkIndex, 'chunkIndex');

  const {localId: localEdvId} = parseLocalId({id: edvId});
  const [{docs: [record]}] = await _client.find({
    selector: {localEdvId, docId, 'chunk.index': chunkIndex},
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
 * @param {number} options.chunkIndex - The index of the chunk.
 *
 * @returns {Promise<boolean>} `true` if the chunk was removed, `false` if it
 *   was not found.
 */
export async function remove({edvId, docId, chunkIndex} = {}) {
  // sadly, this is non-atomic because PouchDB does not offer the necessary
  // primitives
  let record;
  try {
    record = await get({edvId, docId, chunkIndex});
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
