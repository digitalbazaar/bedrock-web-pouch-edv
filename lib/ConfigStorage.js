/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from './assert.js';
import {createDatabase} from './pouchdb.js';

export class ConfigStorage {
  constructor({assertConfig = () => {}, collectionName} = {}) {
    this.assertConfig = assertConfig;
    this.collectionName = collectionName;
    this.client = null;
  }

  /**
   * Initializes a configurations database if it has not already
   * been initialized.
   *
   * @returns {Promise} Settles once the operation completes.
   */
  async initialize() {
    if(this.client) {
      // already initialized
      return;
    }

    this.client = await createDatabase({name: this.collectionName});

    // Note: `_id` is populated using `config.id` and serves as the primary
    // unique index for this collection
  }

  /**
   * Establishes a new object by inserting its configuration into storage.
   *
   * @param {object} options - The options to use.
   * @param {object} options.config - The configuration.
   *
   * @returns {Promise<object>} Resolves to the database record.
   */
  async insert({config} = {}) {
    this.assertConfig(config);

    // require starting sequence to be 0
    if(config.sequence !== 0) {
      throw new Error('Configuration sequence must be "0".');
    }

    // insert config and return record
    const record = {_id: config.id, config};
    const result = await this.client.insertOne({doc: record});
    return result.record;
  }

  /**
   * Updates a config if its sequence number is next.
   *
   * @param {object} options - The options to use.
   * @param {object} options.config - The configuration.
   *
   * @returns {Promise<object>} Resolves to the database record.
   */
  async update({config} = {}) {
    this.assertConfig(config);

    const record = {_id: config.id, config};
    const result = await this.client.updateOne({
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
   * Gets a configuration.
   *
   * @param {object} options - The options to use.
   * @param {object} options.id - The ID of the configuration.
   *
   * @returns {Promise<object>} Resolves to the database record.
   */
  async get({id} = {}) {
    assert.string(id, 'id');

    const {docs: [record]} = await this.client.find({
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
}
