/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as base58 from 'base58-universal';
import {assert} from './assert.js';
import {v4 as uuidv4} from 'uuid';

let _getRandomBytes;

export async function generateLocalId() {
  // 128-bit random number, multibase + identity multihash encoded
  // 0x00 = identity tag, 0x10 = length (16 bytes)
  const data = await getRandomBytes(16);
  return multihashEncode({codec: 0x00, data, multibase: 'z'});
}

export function parseLocalId({id} = {}) {
  assert.string(id, 'id');
  /* Note: Current implementation just returns the `id` as it is not prefixed
  with a base URI. This may change in the future. */
  return {base: '', localId: id};
}

export function getRandomBytes(n) {
  assert.number(n, 'n');
  // lazily create random bytes function
  if(!_getRandomBytes) {
    _getRandomBytes = _createGetRandomBytes();
  }
  return _getRandomBytes(n);
}

export function multibaseDecode({expectedHeader, encoded} = {}) {
  assert.uint8Array(expectedHeader, 'expectedHeader');
  assert.string(encoded, 'encoded');
  if(!encoded.startsWith('z')) {
    throw new Error('"encoded" must be base58-multibase-encoded.');
  }

  const mcValue = base58.decode(encoded.slice(1));
  if(!expectedHeader.every((val, i) => mcValue[i] === val)) {
    throw new Error('Multibase value does not have expected header.');
  }
  return mcValue.slice(expectedHeader.length);
}

export function multibaseEncode({header, data} = {}) {
  assert.uint8Array(header, 'header');
  assert.uint8Array(data, 'data');
  const buf = new Uint8Array(header.length + data.length);
  buf.set(header);
  buf.set(data, header.length);
  // multibase encoding for base58 starts with 'z'
  return `z${base58.encode(buf)}`;
}

export function multihashDecode({
  expectedCodec = 0x00, expectedSize, encoded
} = {}) {
  assert.number(expectedSize, 'expectedSize');
  assert.string(encoded, 'encoded');
  if(expectedSize >= 128) {
    // varint encoding required and not supported
    throw new Error('"data.length" must be less than 128.');
  }
  const expectedHeader = new Uint8Array([expectedCodec, expectedSize]);
  const decoded = multibaseDecode({expectedHeader, encoded});
  if(decoded.length !== expectedSize) {
    throw new Error(
      `Actual decoded data size (${decoded.length}) is not as ` +
      `expected (${expectedSize}).`);
  }
  return decoded;
}

export function multihashEncode({codec = 0x00, data, multibase = 'z'} = {}) {
  assert.uint8Array(data, 'data');
  if(multibase !== 'z') {
    // only base58 encoding is supported
    throw new Error('"multibase" character must be "z".');
  }
  if(data.length >= 128) {
    // varint encoding required and not supported
    throw new Error('"data.length" must be less than 128.');
  }

  // multibase + multihash encoded
  // byte 1 = multihash identifier (e.g., 0x00 = identity tag)
  // byte 2 = length
  const buf = new Uint8Array(2 + data.length);
  buf[0] = codec;
  buf[1] = data.length;
  buf.set(data, 2);
  // multibase encoding for base58 starts with 'z'
  return `z${base58.encode(buf)}`;
}

export function uuid() {
  if(crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return uuidv4();
}

function _createGetRandomBytes() {
  // eslint-disable-next-line no-undef
  const {crypto} = globalThis;

  if(crypto.getRandomValues) {
    return async n => crypto.getRandomValues(new Uint8Array(n));
  }

  if(crypto.randomFill) {
    return async n => new Promise(
      (resolve, reject) => crypto.randomFill(
        new Uint8Array(n), (err, buf) => err ? reject(err) : resolve(buf)));
  }

  throw new Error('"crypto.getRandomValues" or "crypto.randomFill" required.');
}
