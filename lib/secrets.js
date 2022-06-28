/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {multihashDecode, multihashEncode, uuid} from './helpers.js';
import {assert} from './assert.js';
import {ConfigStorage} from './ConfigStorage.js';
import {deriveBits} from './pbkdf2.js';
import {Hmac} from './Hmac.js';
import {Kak} from './Kak.js';
import {Kek} from './Kek.js';

const VERSIONS = new Map([
  ['1', {
    // parameters for version 1
    iterations: 100000,
    // AES-KW is used on a 32 byte key w/8 byte overhead
    wrappedKeySize: 40,
    // salt size in bytes
    saltSize: 16
  }]
]);

let _storage;

/**
 * Initializes the encrypted secrets database.
 *
 * @returns {Promise} Settles once the operation completes.
 */
export async function initialize() {
  if(_storage) {
    // already initialized
    return;
  }

  _storage = new ConfigStorage({
    assertConfig: assert.secretConfig,
    collectionName: 'edv-storage-secret'
  });

  await _storage.initialize();

  // queries by hmac ID
  await _storage.client.createIndex({
    index: {
      fields: ['config.hmacId']
    }
  });

  // queries by keyAgreementKeyId (key agreement key ID)
  await _storage.client.createIndex({
    index: {
      fields: ['config.keyAgreementKeyId']
    }
  });
}

/**
 * Decrypts a secret so its derived keys can be used.
 *
 * @param {object} options - The options to use.
 * @param {object} options.config - The secret configuration.
 * @param {object} options.password - The password to use to decrypt.
 *
 * @returns {Promise<object>} Returns {hmac, keyAgreementKey} on success and
 *   `null` if the password was invalid.
 */
export async function decrypt({config, password} = {}) {
  assert.secretConfig(config);
  assert.string(password, 'password');

  // use password and version parameters to derive key encryption
  const {version, salt, wrappedKey} = config.secret;
  const {wrappedKeySize, saltSize} = VERSIONS.get(version);
  const {kek} = await _deriveKek({
    password,
    salt: await multihashDecode({
      expectedSize: saltSize, encoded: salt
    }),
    version
  });

  // unwrap key derivation key
  const unwrappedKey = await kek.unwrapKey({
    wrappedKey: await multihashDecode({
      expectedSize: wrappedKeySize, encoded: wrappedKey
    })
  });
  if(!unwrappedKey) {
    // invalid password
    return null;
  }

  // import KDK and clear secret value from memory
  const kdk = await Hmac.import({secret: unwrappedKey});
  unwrappedKey.fill(0);

  // derive HMAC and key agreement keys
  const {hmac, keyAgreementKey} = await _deriveKeys({kdk});
  hmac.id = config.hmacId;
  keyAgreementKey.id = config.keyAgreementKeyId;
  return {hmac, keyAgreementKey};
}

/**
 * Generates a new encrypted secret configuration.
 *
 * @param {object} options - The options to use.
 * @param {string} options.id - The ID for the secret.
 * @param {string} options.password - The password to encrypt the secret.
 * @param {string} options.version - The secret version.
 *
 * @returns {Promise<object>} Resolves to `{hmac, keyAgreementKey, config}`.
 */
export async function generate({id, version = '1', password} = {}) {
  if(version !== '1') {
    throw new Error('"version" must be "1".');
  }
  assert.string(id, 'id');
  assert.string(password, 'password');

  // generate an HMAC key and use it to derive other keys
  const kdk = await Hmac.generate();
  const {hmac, keyAgreementKey} = await _deriveKeys({kdk});

  // create encrypted secret from key derivation key
  const {secret} = await _createSecret({kdk, password, version});

  const config = {
    id,
    hmacId: `urn:uuid:${uuid()}`,
    keyAgreementKeyId: `urn:uuid:${uuid()}`,
    secret,
    sequence: 0
  };

  hmac.id = config.hmacId;
  keyAgreementKey.id = config.keyAgreementKeyId;

  return {hmac, keyAgreementKey, config};
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
  return _storage.insert({config});
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
  return _storage.update({config});
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
  return _storage.get({id});
}

async function _createSecret({kdk, password, version} = {}) {
  // use password and version parameters to derive key encryption
  const {kek, algorithm} = await _deriveKek({password, version});

  // wrap key derivation key for storage and reuse later
  const wrappedKey = await kek.wrapKey({unwrappedKey: kdk.key});

  return {
    secret: {
      version,
      salt: multihashEncode({data: algorithm.salt}),
      wrappedKey: multihashEncode({data: wrappedKey})
    }
  };
}

async function _deriveKek({password, salt, version} = {}) {
  const {iterations, saltSize} = VERSIONS.get(version);
  const {
    derivedBits: kekSecret,
    algorithm
  } = await deriveBits({
    bitLength: 256, iterations, password, salt, saltSize
  });
  const kek = await Kek.import({secret: kekSecret});
  kekSecret.fill(0);
  return {kek, algorithm};
}

async function _deriveKeys({kdk} = {}) {
  // generate secrets for an HMAC and a key agreement key
  const encoder = new TextEncoder();
  const hmacSecret = await kdk.sign({data: encoder.encode('hmac')});
  const kakSecret = await kdk.sign({data: encoder.encode('keyAgreementKey')});

  // derive hmac and key agreement keys
  const hmac = await Hmac.import({secret: hmacSecret});
  const keyAgreementKey = await Kak.import({secret: kakSecret});

  // clear secrets
  hmacSecret.fill(0);
  kakSecret.fill(0);

  return {hmac, keyAgreementKey};
}
