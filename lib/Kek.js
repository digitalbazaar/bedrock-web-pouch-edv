/*!
 * Copyright (c) 2022-2023 Digital Bazaar, Inc. All rights reserved.
 */
// eslint-disable-next-line no-undef
const {crypto} = globalThis;

const EXTRACTABLE = true;

export class Kek {
  constructor({key} = {}) {
    this.key = key;
  }

  /**
   * Wraps a cryptographic key.
   *
   * @param {object} options - The options to use.
   * @param {Uint8Array|CryptoKey} options.unwrappedKey - The key material as a
   *   `Uint8Array` or CryptoKey.
   *
   * @returns {Promise<Uint8Array>} - The wrapped key bytes.
   */
  async wrapKey({unwrappedKey} = {}) {
    const kek = this.key;

    if(unwrappedKey instanceof Uint8Array) {
      // Note: `HMAC` algorithm name doesn't matter; will be exported raw.
      const extractable = true;
      unwrappedKey = await crypto.subtle.importKey(
        'raw', unwrappedKey, {
          name: 'HMAC', hash: 'SHA-512', length: unwrappedKey.length * 8
        },
        // key usage of `sign` refers to the key that is to be wrapped not
        // the KEK itself; we just treat it like an HMAC key regardless of
        // what it is
        extractable, ['sign']);
    }
    const wrappedKey = await crypto.subtle.wrapKey(
      'raw', unwrappedKey, kek, kek.algorithm);
    return new Uint8Array(wrappedKey);
  }

  /**
   * Unwraps a cryptographic key.
   *
   * @param {object} options - The options to use.
   * @param {Uint8Array} options.wrappedKey - The wrapped key material.
   *
   * @returns {Promise<Uint8Array>} - Resolves to the key bytes or null if
   *   the unwrapping fails because the key does not match.
   */
  async unwrapKey({wrappedKey}) {
    const kek = this.key;
    // Note: `HMAC` algorithm name doesn't matter; will be exported raw.
    try {
      const key = await crypto.subtle.unwrapKey(
        'raw', wrappedKey, kek, kek.algorithm,
        // key usage of `encrypt` refers to the key that is being unwrapped;
        // we just treat it like an HMAC key regardless of what it is
        {name: 'HMAC', hash: 'SHA-512'}, EXTRACTABLE, ['sign']);
      const keyBytes = await crypto.subtle.exportKey('raw', key);
      return new Uint8Array(keyBytes);
    } catch(e) {
      // unwrapping key failed
      return null;
    }
  }

  static async import({secret} = {}) {
    const key = await crypto.subtle.importKey(
      'raw', secret, {name: 'AES-KW', length: 256}, EXTRACTABLE,
      ['wrapKey', 'unwrapKey']);
    return new Kek({key});
  }
}
