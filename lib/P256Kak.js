/*!
 * Copyright (c) 2022-2023 Digital Bazaar, Inc. All rights reserved.
 */
import * as EcdsaMultikey from '@digitalbazaar/ecdsa-multikey';
import {assert} from './assert.js';

export class P256Kak {
  constructor({id, keyPair} = {}) {
    this.id = id;
    this.keyPair = keyPair;
    this.type = 'Multikey';
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
    return this.keyPair.deriveSecret({publicKey});
  }

  async export({publicKey = true, privateKey = false} = {}) {
    const {id, type, keyPair} = this;
    const exported = keyPair.export(
      {publicKey, secretKey: privateKey, includeContext: true});
    exported.id = id;
    exported.type = type;
    return exported;
  }

  static async generate() {
    const keyPair = await EcdsaMultikey.generate({curve: 'P-256'});
    return new P256Kak({keyPair});
  }

  static async import({secretKey, publicKey} = {}) {
    const keyPair = await EcdsaMultikey.fromRaw(
      {curve: 'P-256', secretKey, publicKey, keyAgreementKey: true});
    return new P256Kak({keyPair});
  }
}
