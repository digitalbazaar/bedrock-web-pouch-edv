/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as assert from './assert.js';
import {EdvClientCore} from '@digitalbazaar/edv-client';
import {PouchTransport} from './PouchTransport.js';

export class PouchEdvClient extends EdvClientCore {
  /**
   * Creates a new EDV client for connecting to an Encrypted Data Vault (EDV)
   * that is stored in PouchDB.
   *
   * @param {object} options - The options to use.
   * @param {object} [options.hmac] - A default HMAC API for blinding
   *   indexable attributes.
   * @param {string} [options.id] - The ID of the EDV.
   * @param {object} [options.keyAgreementKey] - A default KeyAgreementKey
   *   API for deriving shared KEKs for wrapping content encryption keys.
   * @param {Function} [options.keyResolver] - A default function that returns
   *   a Promise that resolves a key ID to a DH public key.
   *
   * @returns {PouchEdvClient}.
   */
  constructor({hmac, id, keyAgreementKey, keyResolver} = {}) {
    super({hmac, id, keyAgreementKey, keyResolver});
    this.transport = new PouchTransport({edvId: this.id});
  }

  /**
   * @inheritdoc
   *
   * @param {object} options - The options to use.
   * @param {object} options.doc - The document to insert.
   * @param {ReadableStream} [options.stream] - A WHATWG Readable stream to read
   *   from to associate chunked data with this document.
   * @param {number} [options.chunkSize=1048576] - The size, in bytes, of the
   *   chunks to break the incoming stream data into.
   * @param {object[]} [options.recipients=[]] - A set of JWE recipients
   *   to encrypt the document for; if not present, a default recipient will
   *   be added using `this.keyAgreementKey` and if no `keyAgreementKey` is
   *   set, an error will be thrown.
   *
   * @returns {Promise<object>} - Resolves to the inserted document.
   */
  async insert({
    doc, stream, chunkSize, recipients = []
  } = {}) {
    const {transport} = this;
    return super.insert({doc, stream, chunkSize, recipients, transport});
  }

  /**
   * @inheritdoc
   *
   * @param {object} options - The options to use.
   * @param {object} options.doc - The document to insert.
   * @param {ReadableStream} [options.stream] - A WHATWG Readable stream to read
   *   from to associate chunked data with this document.
   * @param {number} [options.chunkSize=1048576] - The size, in bytes, of the
   *   chunks to break the incoming stream data into.
   * @param {object} [options.recipients=[]] - A set of JWE recipients to
   *   encrypt the document for; if present, recipients will be added to any
   *   existing recipients; to remove existing recipients, modify the
   *   `encryptedDoc.jwe.recipients` field.
   *
   * @returns {Promise<object>} - Resolves to the updated document.
   */
  async update({doc, stream, chunkSize, recipients = []} = {}) {
    const {transport} = this;
    return super.update({doc, stream, chunkSize, recipients, transport});
  }

  /**
   * @inheritdoc
   *
   * @param {object} options - The options to use.
   * @param {object} options.doc - The document to delete.
   * @param {object} [options.recipients=[]] - A set of JWE recipients to
   *   encrypt the document for; if present, recipients will be added to
   *   any existing recipients; to remove existing recipients, modify
   *   the `encryptedDoc.jwe.recipients` field.
   *
   * @returns {Promise<boolean>} - Resolves to `true` if the document was
   *   deleted.
   */
  async delete({doc, recipients = []} = {}) {
    const {transport} = this;
    return super.delete({doc, recipients, transport});
  }

  /**
   * @inheritdoc
   *
   * @param {object} options - The options to use.
   * @param {string} options.id - The ID of the document to get.
   *
   * @returns {Promise<object>} - Resolves to the document.
   */
  async get({id} = {}) {
    const {transport} = this;
    return super.get({id, transport});
  }

  /**
   * @inheritdoc
   *
   * @param {object} options - The options to use.
   * @param {object} options.doc - The document to get a stream for.
   *
   * @returns {Promise<ReadableStream>} - Resolves to a `ReadableStream` to
   *   read the chunked data from.
   */
  async getStream({doc} = {}) {
    const {transport} = this;
    return super.getStream({doc, transport});
  }

  /**
   * @inheritdoc
   *
   * @see find - For more detailed documentation on the search options.
   *
   * @param {object} options - The options to use.
   * @param {object|Array} [options.equals] - An object with key-value
   *   attribute pairs to match or an array of such objects.
   * @param {string|Array} [options.has] - A string with an attribute name to
   *   match or an array of such strings.
   *
   * @returns {Promise<number>} - Resolves to the number of matching documents.
  */
  async count({equals, has} = {}) {
    const {transport} = this;
    return super.count({equals, has, transport});
  }

  /**
   * @inheritdoc
   *
   * @param {object} options - The options to use.
   * @param {object|Array} [options.equals] - An object with key-value
   *   attribute pairs to match or an array of such objects.
   * @param {string|Array} [options.has] - A string with an attribute name to
   *   match or an array of such strings.
   * @param {boolean} [options.count] - Set to `false` to find all documents
   *   that match a query or to `true` to give a count of documents.
   *
   * @returns {Promise<object>} - Resolves to the matching documents:
   *   {documents: [...]}.
   */
  async find({equals, has, count = false} = {}) {
    const {transport} = this;
    return super.find({equals, has, count, transport});
  }

  /**
   * @inheritdoc
   *
   * @param {object} options - The options to use.
   *
   * @returns {Promise<object>} - Resolves to the configuration for the EDV.
   */
  async getConfig({} = {}) {
    const {transport} = this;
    return super.getConfig({transport});
  }

  /**
   * @inheritdoc
   *
   * @param {object} options - The options to use.
   * @param {object} options.config - The new EDV config.
   *
   * @returns {Promise<void>} - Resolves once the operation completes.
   */
  async updateConfig({config} = {}) {
    const {transport} = this;
    return super.updateConfig({config, transport});
  }

  /**
   * Creates a new EDV using the given configuration.
   *
   * @param {object} options - The options to use.
   * @param {string} options.config - The EDV's configuration.
   *
   * @returns {Promise<object>} - Resolves to the configuration for the newly
   *   created EDV.
   */
  static async createEdv({config} = {}) {
    assert.edvConfig(config);
    const transport = new PouchTransport({edvId: config.id});
    return transport.createEdv({config});
  }

  static async create({edvId, password} = {}) {
    // FIXME: use `secrets.js` to get secret config associated with `edvId`
    // FIXME: unlock its secret using `password`, throwing if it fails
    // FIXME: create PouchEdvClient instance using `keyResolver` that resolves
    // only using the generated keys
  }
}
