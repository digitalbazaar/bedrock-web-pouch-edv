/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from '../assert.js';
import {PouchDB} from '../pouchdb.js';

const COLLECTION_NAME = 'edv-storage-config';

let _client;

export async function initialize() {
  _client = new PouchDB(COLLECTION_NAME, {auto_compaction: true});
  await _createIndexes();
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
  _assertConfig(config);

  // require starting sequence to be 0
  if(config.sequence !== 0) {
    throw new Error('Configuration sequence must be "0".');
  }

  // insert config and return record
  const record = {config};
  const result = await _client.insertOne({
    doc: record, selector: {'config.id': config.id}
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
  _assertConfig(config);

  const record = {config};
  const result = await _client.updateOne({
    doc: record,
    selector: {
      'config.id': config.id,
      'config.sequence': config.sequence - 1
    }
  });
  if(!result) {
    const error = new Error(
      'Could not update configuration. Record sequence does not match or ' +
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
    selector: {'config.id': id}
  });
  if(!record) {
    const error = new Error('Configuration not found.');
    error.name = 'NotFoundError';
    throw error;
  }
  return record;
}

async function _createIndexes() {
  await _client.createIndex({
    index: {
      fields: ['config.id']
    }
  });
  await _client.createIndex({
    index: {
      fields: ['config.controller']
    }
  });
}

function _assertConfig(config) {
  assert.object(config, 'config');
  assert.string(config.id, 'config.id');
  assert.string(config.controller, 'config.controller');
  assert.number(config.sequence, 'config.sequence');

  assert.object(config.keyAgreementKey, 'config.keyAgreementKey');
  assert.object(config.hmac, 'config.hmac');
  if(config.keyAgreementKey) {
    assert.string(config.keyAgreementKey.id, 'config.keyAgreementKey.id');
    assert.string(config.keyAgreementKey.type, 'config.keyAgreementKey.type');
  }
  if(config.hmac) {
    assert.string(config.hmac.id, 'config.hmac.id');
    assert.string(config.hmac.type, 'config.hmac.type');
  }
}
