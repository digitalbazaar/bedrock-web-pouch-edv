/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as chunks from './chunks.js';
import * as docs from './docs.js';
import * as edvs from './edvs.js';

export class PouchTransport {
  /**
   * Creates a transport layer for an EDV client to use to perform an
   * operation with an EDV stored using PouchDB.
   *
   * @param {object} options - The options to use.
   * @param {string} [options.edvId] - The ID of the target EDV.
   *
   * @returns {PouchTransport}.
   */
  constructor({edvId} = {}) {
    this.edvId = edvId;
  }

  /**
   * @inheritdoc
   */
  async createEdv({config} = {}) {
    try {
      const record = await edvs.insert({config});
      return record.config;
    } catch(e) {
      if(e.name === 'ConstraintError') {
        const err = new Error('Duplicate error.');
        err.name = 'DuplicateError';
        err.cause = e;
        throw err;
      }
      throw e;
    }
  }

  /**
   * @inheritdoc
   */
  async getConfig({id = this.edvId} = {}) {
    const record = await edvs.get({id});
    return record.config;
  }

  /**
   * @inheritdoc
   */
  async updateConfig({config} = {}) {
    const record = await edvs.update({config});
    return record.config;
  }

  /**
   * @inheritdoc
   */
  async insert({encrypted} = {}) {
    try {
      await docs.insert({edvId: this.edvId, doc: encrypted});
    } catch(e) {
      if(e.name === 'ConstraintError') {
        const err = new Error('Duplicate error.');
        err.name = 'DuplicateError';
        err.cause = e;
        throw err;
      }
      throw e;
    }
  }

  /**
   * @inheritdoc
   */
  async update({encrypted} = {}) {
    await docs.upsert({edvId: this.edvId, doc: encrypted});
  }

  /**
   * @inheritdoc
   */
  async get({id} = {}) {
    const record = await docs.get({edvId: this.edvId, id});
    return record.doc;
  }

  /**
   * @inheritdoc
   */
  async find({query} = {}) {
    const {edvId} = this;
    const findQuery = docs.createQuery({edvId, edvQuery: query});
    const {records} = await docs.find({edvId, query: findQuery});
    if(query.count === true) {
      return {count: records.length};
    }
    return {documents: records.map(({doc}) => doc)};
  }

  /**
   * @inheritdoc
   */
  async storeChunk({docId, chunk}) {
    return chunks.upsert({edvId: this.edvId, docId, chunk});
  }

  /**
   * @inheritdoc
   */
  async getChunk({docId, chunkIndex} = {}) {
    const record = await chunks.get({
      edvId: this.edvId, docId, index: chunkIndex
    });
    return record.doc;
  }
}
