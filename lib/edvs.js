/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from './assert.js';
import {PouchDB} from './pouchdb.js';

const COLLECTION_NAME = 'edv-storage-config';

let _client;

/**
 * Initializes the encrypted data vault configurations database.
 *
 * @returns {Promise} Settles once the operation completes.
 */
export async function initialize() {
  _client = new PouchDB(COLLECTION_NAME, {auto_compaction: true});

  // Note: `_id` is populated using `config.id` and serves as the primary
  // unique index for this collection

  // queries by controller
  await _client.createIndex({
    index: {
      fields: ['config.controller']
    }
  });
}

/**
 * Establishes a new EDV by inserting its configuration into storage.
 *
 * @param {object} options - The options to use.
 * @param {object} options.config - The EDV configuration.
 *
 * @returns {Promise<object>} Resolves to the database record.
 */
export async function insert({config} = {}) {
  assert.config(config);

  // require starting sequence to be 0
  if(config.sequence !== 0) {
    throw new Error('Configuration sequence must be "0".');
  }

  // insert config and return record
  const record = {_id: config.id, config};
  const result = await _client.insertOne({doc: record});
  return result.record;
}

/**
 * Updates an EDV config if its sequence number is next.
 *
 * @param {object} options - The options to use.
 * @param {object} options.config - The EDV configuration.
 *
 * @returns {Promise<object>} Resolves to the database record.
 */
export async function update({config} = {}) {
  assert.config(config);

  const record = {_id: config.id, config};
  const result = await _client.updateOne({
    doc: record,
    query: {
      selector: {
        _id: config.id,
        'config.sequence': config.sequence - 1
      }
    }
  });
  if(!result) {
    const error = new Error(
      'Could not update configuration. Sequence does not match or ' +
      'configuration does not exist.');
    error.name = 'InvalidStateError';
    throw error;
  }
  return result.record;
}

/**
 * Gets an EDV configuration.
 *
 * @param {object} options - The options to use.
 * @param {object} options.id - The ID of the EDV.
 *
 * @returns {Promise<object>} Resolves to the database record.
 */
export async function get({id} = {}) {
  assert.string(id, 'id');

  const {docs: [record]} = await _client.find({
    selector: {_id: id},
    limit: 1
  });
  if(!record) {
    const error = new Error('Configuration not found.');
    error.name = 'NotFoundError';
    throw error;
  }
  return record;
}
