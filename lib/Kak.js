/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from './assert.js';
import {multibaseDecode} from './helpers.js';
import nacl from 'tweetnacl';

// multicodec x25519-pub header as varint
const MULTICODEC_X25519_PUB_HEADER = new Uint8Array([0xec, 0x01]);

export class Kak {
  constructor({keyPair} = {}) {
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

  static async generate() {
    const {secretKey: privateKey, publicKey} = nacl.box.keyPair();
    const keyPair = {privateKey, publicKey};
    return new Kak({keyPair});
  }

  static async import({secret} = {}) {
    assert.uint8Array(secret, 'secret');
    const {publicKey} = nacl.box.keyPair.fromSecretKey(secret);
    const keyPair = {privateKey: secret, publicKey};
    return new Kak({keyPair});
  }
}
