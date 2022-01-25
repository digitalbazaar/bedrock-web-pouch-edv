/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from './assert.js';
import {PouchDB} from './pouchdb.js';

const COLLECTION_NAME = 'edv-storage-config';

let _client;

export async function initialize() {
  _client = new PouchDB(COLLECTION_NAME, {auto_compaction: true});

  // queries by ID (and should be unique)
  await _client.createIndex({
    index: {
      fields: ['config.id']
    }
  });

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
  const record = {config};
  const result = await _client.insertOne({
    doc: record,
    uniqueConstraints: _uniqueConstraints({config})
  });
  return result.record;
}

/**
 * Updates an EDV config if its sequence number is next.
 *
 * @param {object} options - The options to use.
 * @param {object} options.config - The EDV configuration.
 *
 * @returns {Promise} Resolves once the operation completes.
 */
export async function update({config} = {}) {
  assert.config(config);

  const record = {config};
  const result = await _client.updateOne({
    doc: record,
    query: {
      selector: {
        'config.id': config.id,
        'config.sequence': config.sequence - 1
      }
    },
    uniqueConstraints: _uniqueConstraints({config})
  });
  if(!result) {
    const error = new Error(
      'Could not update configuration. Sequence does not match or ' +
      'configuration does not exist.');
    error.name = 'InvalidStateError';
    throw error;
  }
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

  const [{docs: [record]}] = await _client.find({
    selector: {'config.id': id},
    limit: 1
  });
  if(!record) {
    const error = new Error('Configuration not found.');
    error.name = 'NotFoundError';
    throw error;
  }
  return record;
}

function _uniqueConstraints({config}) {
  return [{selector: {'config.id': config.id}}];
}
