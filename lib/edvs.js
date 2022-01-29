/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from './assert.js';
import {ConfigStorage} from './ConfigStorage.js';

const _storage = new ConfigStorage({
  assertConfig: assert.edvConfig,
  collectionName: 'edv-storage-config'
});

/**
 * Initializes the encrypted data vault configurations database.
 *
 * @returns {Promise} Settles once the operation completes.
 */
export async function initialize() {
  await _storage.initialize();

  // queries by controller
  await _storage.client.createIndex({
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
  return _storage.insert({config});
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
  return _storage.update({config});
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
  return _storage.get({id});
}
