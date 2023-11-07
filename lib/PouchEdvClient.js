/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as edvs from './edvs.js';
import * as secrets from './secrets.js';
import {assert} from './assert.js';
import {EdvClientCore} from '@digitalbazaar/edv-client';
import {initialize} from './initialize.js';
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
   * @param {string} [options.cipherVersion='recommended'] - Sets the cipher
   *   version to either "recommended" or "fips".
   *
   * @returns {PouchEdvClient} - PouchEdvClient.
   */
  constructor({hmac, id, keyAgreementKey, keyResolver, cipherVersion} = {}) {
    super({hmac, id, keyAgreementKey, keyResolver, cipherVersion});
    this.transport = new PouchTransport({edvId: this.id});
    // create a transport for marking tombstoned EDV docs as deleted to
    // improve pouchdb index performance
    this._deleteTransport = Object.create(this.transport);
    this._deleteTransport.update = async ({encrypted}) =>
      this.transport.update({encrypted, deleted: true});
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
    const {_deleteTransport} = this;
    return super.delete({doc, recipients, transport: _deleteTransport});
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
   * @param {number} [options.limit] - Set to limit the number of documents
   *   to be returned from a query (min=1, max=1000).
   *
   * @returns {Promise<object>} - Resolves to the matching documents:
   *   {documents: [...]}.
   */
  async find({equals, has, count = false, limit} = {}) {
    const {transport} = this;
    return super.find({equals, has, count, limit, transport});
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
   * @param {string} [options.password] - A password to use if the keys for
   *   the EDV should be generated and stored locally in encrypted storage.
   * @param {string} [options.cipherVersion='recommended'] - Sets the cipher
   *   version to either "recommended" or "fips".
   *
   * @returns {Promise<object>} - Resolves to an object with:
   *   `{config, edvClient}`; `edvClient` will be set if `password` is passed.
   */
  static async createEdv({config, password, cipherVersion} = {}) {
    // initialize EDV databases (if not already initialized)
    await initialize();

    let edvClient;
    if(password !== undefined) {
      if(config.hmac || config.keyAgreementKey) {
        throw new Error(
          '"config" must not have "hmac" or "keyAgreementKey" if these are ' +
          'to be populated using locally generated secrets.');
      }

      // generate encrypted secret, use the EDV ID as the secret's ID ... if
      // it already exists, try to reuse it
      const {hmac, keyAgreementKey} = await _lazyCreateSecret({
        id: config.id, password, cipherVersion
      });
      config = {
        ...config,
        hmac: {id: hmac.id, type: hmac.type},
        keyAgreementKey: {id: keyAgreementKey.id, type: keyAgreementKey.type}
      };
      edvClient = new PouchEdvClient({
        hmac, id: config.id, keyAgreementKey,
        keyResolver: await _createKeyResolver({
          keyAgreementKey, edvConfig: config
        }),
        cipherVersion
      });
    }

    assert.edvConfig(config);
    const transport = new PouchTransport({edvId: config.id});
    const newConfig = await transport.createEdv({config});
    return {config: newConfig, edvClient};
  }

  /**
   * Creates a new EDV client based on encrypted secrets saved in a local
   * PouchDB instance. The password to decrypt the secrets must be given.
   *
   * @param {object} options - The options to use.
   * @param {string} [options.edvId] - The ID of the EDV.
   * @param {string} [options.password] - The password to use to decrypt
   *   the secrets.
   *
   * @returns {PouchEdvClient} - PouchEdvClient.
   */
  static async fromLocalSecrets({edvId, password} = {}) {
    // initialize EDV databases (if not already initialized)
    await initialize();

    // start getting EDV config
    const edvConfigPromise = edvs.get({id: edvId});
    edvConfigPromise.catch(e => e);

    // load secret using the EDV ID as the secret ID
    const {config} = await secrets.get({id: edvId});
    const result = await secrets.decrypt({config, password});
    if(!result) {
      throw new Error('Invalid password.');
    }
    const {hmac, keyAgreementKey, cipherVersion} = result;

    // finish getting EDV config
    const edvConfigResult = await edvConfigPromise;
    if(edvConfigResult instanceof Error) {
      throw edvConfigResult;
    }
    const {config: edvConfig} = edvConfigResult;

    return new PouchEdvClient({
      hmac, id: config.id, keyAgreementKey,
      keyResolver: await _createKeyResolver({keyAgreementKey, edvConfig}),
      cipherVersion
    });
  }

  /**
   * Generates a multibase encoded random 128-bit identifier for a document.
   *
   * @returns {Promise<string>} - Resolves to the identifier.
   */
  static async generateId() {
    return EdvClientCore.generateId();
  }
}

async function _createKeyResolver({keyAgreementKey, edvConfig} = {}) {
  // create key resolver for the EDV's key agreement key (and no other keys)
  const key = await keyAgreementKey.export();
  key.controller = edvConfig.controller;
  return async function keyResolver({id}) {
    if(id === keyAgreementKey.id) {
      return key;
    }
    const error = new Error('Key not found.');
    error.name = 'NotFoundError';
    throw error;
  };
}

// called during EDV creation
async function _lazyCreateSecret({id, password, cipherVersion} = {}) {
  // generate encrypted secret, use the EDV ID as the secret's ID
  const {hmac, keyAgreementKey, config} = await secrets.generate(
    {id, password, cipherVersion});
  try {
    await secrets.insert({config});
    return {hmac, keyAgreementKey, config};
  } catch(e) {
    if(e.name === 'ConstraintError') {
      // secret already exists... if EDV config already exists, throw a
      // duplicate error
      try {
        await edvs.get({id});
        const error = new Error('Duplicate EDV configuration.');
        error.name = 'DuplicateError';
        throw error;
      } catch(e) {
        if(e.name !== 'NotFoundError') {
          throw e;
        }
      }

      // try to load existing secret and reuse it as it doesn't have a
      // matching EDV config yet
      const {config} = await secrets.get({id});
      const result = await secrets.decrypt({config, password});
      if(!result) {
        throw new Error(
          `Secret already exists for EDV ID (${id}) but password to unlock ` +
          'it is invalid.');
      }
      const {hmac, keyAgreementKey} = result;
      return {hmac, keyAgreementKey, config};
    }
    throw e;
  }
}
