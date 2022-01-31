/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from './assert.js';
import {getRandomBytes} from './helpers.js';

// eslint-disable-next-line no-undef
const {crypto} = globalThis;

const ALGORITHM = {name: 'PBKDF2'};
const EXTRACTABLE = false;
const KEY_USAGE = ['deriveBits', 'deriveKey'];

/**
 * Derive key bits from a password.
 *
 * @param {object} options - The options to use.
 * @param {number} options.bitLength - The number of bytes to derive.
 * @param {number} [options.iterations=100000] - The number of iterations to
 *   use.
 * @param {string} options.password - The password to use.
 * @param {Uint8Array} [options.salt] - The salt to use; one will be
 *   generated if not provided.
 *
 * @returns {Promise<Uint8Array>} The derived bits.
 */
export async function deriveBits({
  bitLength, iterations = 100000, password, salt
} = {}) {
  assert.nonNegativeSafeInteger(bitLength, 'bitLength');
  assert.nonNegativeSafeInteger(iterations, 'iterations');
  assert.string(password, 'password');
  if(salt !== undefined) {
    assert.uint8Array(salt, 'salt');
  } else {
    salt = await getRandomBytes(16);
  }

  const kdk = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password),
    ALGORITHM, EXTRACTABLE, KEY_USAGE);

  const algorithm = {
    ...ALGORITHM,
    salt,
    iterations,
    hash: 'SHA-256'
  };
  const derivedBits = new Uint8Array(await crypto.subtle.deriveBits(
    algorithm, kdk, bitLength));
  return {algorithm, derivedBits};
}
