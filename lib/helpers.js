/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as base58 from 'base58-universal';

let _getRandomBytes;

export async function generateLocalId() {
  if(!_getRandomBytes) {
    _getRandomBytes = _createGetRandomBytes();
  }

  // 128-bit random number, multibase + identity multihash encoded
  // 0x00 = identity tag, 0x10 = length (16 bytes)
  const buf = new Uint8Array(18);
  buf[0] = 0x00;
  buf[1] = 0x10;
  buf.set(await _getRandomBytes(16), 2);
  // multibase encoding for base58 starts with 'z'
  return `z${base58.encode(buf)}`;
}

export function parseLocalId({id} = {}) {
  /* Note: Current implementation just returns the `id` as it is not prefixed
  with a base URI. This may change in the future. */
  return {base: '', localId: id};
}

function _createGetRandomBytes() {
  // eslint-disable-next-line no-undef
  const {crypto} = globalThis;

  if(crypto.getRandomValues) {
    return async s => crypto.getRandomValues(new Uint8Array(s));
  }

  if(crypto.randomFill) {
    return async s => new Promise(
      (resolve, reject) => crypto.randomFill(
        new Uint8Array(s), (err, buf) => err ? reject(err) : resolve(buf)));
  }

  throw new Error('"crypto.getRandomValues" or "crypto.randomFill" required.');
}
