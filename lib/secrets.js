/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from './assert.js';
import {PouchDB} from './pouchdb.js';

const COLLECTION_NAME = 'edv-storage-secret';

let _client;

// FIXME: Note: This code is duplicated w/ EDV configs, make a `configs.js`
// and share code -- only difference is `COLLECTION_NAME`

/**
 * Initializes the encrypted secrets database.
 *
 * @returns {Promise} Settles once the operation completes.
 */
export async function initialize() {
  _client = new PouchDB(COLLECTION_NAME, {auto_compaction: true});

  // Note: `_id` is populated using `config.id` and serves as the primary
  // unique index for this collection

  // queries by hmac ID
  await _client.createIndex({
    index: {
      fields: ['config.hmacId']
    }
  });

  // queries by keyAgreementKeyId (key agreement key ID)
  await _client.createIndex({
    index: {
      fields: ['config.keyAgreementKeyId']
    }
  });
}

/**
 * Generates a new encrypted secret configuration.
 *
 * @param {object} options - The options to use.
 * @param {string} options.id - The ID for the secret.
 * @param {string} options.password - The password to encrypt the secret.
 *
 * @returns {Promise<object>} Resolves to `{hmac, keyAgreementKey, config}`.
 */
 export async function generate({id, password} = {}) {
   // FIXME: generate large crypto-secure random as `secret`
   // FIXME: use large random to derive HMAC and KAK
   // FIXME: create Hmac instance
   // FIXME: create KeyAgreementKey instance
   // FIXME: derive aes-kw from password
   // FIXME: encrypt `secret` using aes-kw
   // FIXME: create config w/ IDs from hmac, kak, and store the encrypted
   // `secret` value

   // FIXME: return hmac, keyAgreementKey, config
 }

/**
 * Establishes a new secret by inserting its config into storage.
 *
 * @param {object} options - The options to use.
 * @param {object} options.config - The secret configuration.
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
 * Updates a secret config if its sequence number is next.
 *
 * @param {object} options - The options to use.
 * @param {object} options.config - The secret configuration.
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
 * Gets a secret configuration.
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
