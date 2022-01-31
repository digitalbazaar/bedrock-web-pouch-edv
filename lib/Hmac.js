/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from './assert.js';

// eslint-disable-next-line no-undef
const {crypto} = globalThis;

const ALGORITHM = {name: 'HMAC', hash: {name: 'SHA-256'}};
const EXTRACTABLE = true;
const KEY_USAGE = ['sign', 'verify'];

export class Hmac {
  constructor({key} = {}) {
    this.key = key;
    this.algorithm = 'HS256';
    this.type = 'Sha256HmacKey2019';
  }

  /**
   * Signs some data.
   *
   * @param {object} options - The options to use.
   * @param {Uint8Array} options.data - The data to sign.
   *
   * @returns {Promise<Uint8Array>} The signature.
   */
  async sign({data} = {}) {
    assert.uint8Array(data, 'data');
    const key = this.key;
    return new Uint8Array(await crypto.subtle.sign(key.algorithm, key, data));
  }

  /**
   * Verifies some data.
   *
   * @param {object} options - The options to use.
   * @param {Uint8Array} options.data - The data to sign as a Uint8Array.
   * @param {Uint8Array} options.signature - The Uint8Array signature
   *   to verify.
   *
   * @returns {Promise<boolean>} `true` if verified, `false` if not.
   */
  async verify({data, signature} = {}) {
    assert.uint8Array(data, 'data');
    assert.uint8Array(signature, 'signature');
    const key = this.key;
    return crypto.subtle.verify(key.algorithm, key, signature, data);
  }

  static async generate() {
    const key = await crypto.subtle.generateKey(
      ALGORITHM, EXTRACTABLE, KEY_USAGE);
    return new Hmac({key});
  }

  static async import({secret} = {}) {
    assert.uint8Array(secret, 'secret');
    const key = await crypto.subtle.importKey(
      'raw', secret, ALGORITHM, EXTRACTABLE, KEY_USAGE);
    return new Hmac({key});
  }
}
