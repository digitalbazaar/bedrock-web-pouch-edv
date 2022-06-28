/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {multibaseDecode, multibaseEncode} from './helpers.js';
import {assert} from './assert.js';
import nacl from 'tweetnacl';

const CONTEXT_URL = 'https://w3id.org/security/suites/x25519-2020/v1';
// multicodec x25519-pub header as varint
const MULTICODEC_X25519_PUB_HEADER = new Uint8Array([0xec, 0x01]);
// multicodec x25519-priv header as varint
const MULTICODEC_X25519_PRIV_HEADER = new Uint8Array([0x82, 0x26]);

export class Kak {
  constructor({id, keyPair} = {}) {
    this.id = id;
    this.keyPair = keyPair;
    this.type = 'X25519KeyAgreementKey2020';
  }

  /**
  * Derives a shared secret via the given peer public key, typically for use
  * as one parameter for computing a shared key. It should not be used as
  * a shared key itself, but rather input into a key derivation function (KDF)
  * to produce a shared key.
  *
  * @param {object} options - The options to use.
  * @param {object} options.publicKey - The public key to compute the shared
  *   secret against; the public key type must match this KeyAgreementKey's
  *   type.
  *
  * @returns {Promise<Uint8Array>} The shared secret bytes.
  */
  async deriveSecret({publicKey} = {}) {
    assert.object(publicKey);
    if(publicKey.type !== this.type) {
      throw Error(
        `The given public key type "${publicKey.type}" does not match this ` +
        `key agreement key's ${this.type}.`);
    }
    const {publicKeyMultibase} = publicKey;
    assert.string(publicKeyMultibase);

    // get public key bytes as remote public key
    const remotePublicKey = multibaseDecode({
      expectedHeader: MULTICODEC_X25519_PUB_HEADER,
      encoded: publicKeyMultibase
    });

    // `scalarMult` takes secret key as param 1, public key as param 2
    const {keyPair: {privateKey}} = this;
    return nacl.scalarMult(privateKey, remotePublicKey);
  }

  async export({publicKey = true, privateKey = false} = {}) {
    const {id, type, keyPair} = this;
    const exported = {
      '@context': CONTEXT_URL,
      id,
      type
    };
    if(publicKey) {
      exported.publicKeyMultibase = multibaseEncode({
        header: MULTICODEC_X25519_PUB_HEADER, data: keyPair.publicKey
      });
    }
    if(privateKey) {
      exported.privateKeyMultibase = multibaseEncode({
        header: MULTICODEC_X25519_PRIV_HEADER, data: keyPair.privateKey
      });
    }
    return exported;
  }

  static async generate() {
    const {secretKey: privateKey, publicKey} = nacl.box.keyPair();
    const keyPair = {privateKey, publicKey};
    return new Kak({keyPair});
  }

  static async import({secret} = {}) {
    assert.uint8Array(secret, 'secret');
    const {publicKey} = nacl.box.keyPair.fromSecretKey(secret);
    const keyPair = {privateKey: new Uint8Array(secret).slice(), publicKey};
    return new Kak({keyPair});
  }
}
