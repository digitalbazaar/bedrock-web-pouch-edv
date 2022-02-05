/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as base58 from 'base58-universal';

export const assert = {
  array, chunk, doc, edvConfig, edvQuery, localId, nonNegativeSafeInteger,
  number, object, secretConfig, sequence, string, uint8Array
};

function array(x, name) {
  if(!(x && Array.isArray(x))) {
    throw new TypeError(`"${name}" must be an array.`);
  }
}

function chunk(x) {
  assert.object(x, 'chunk');
  assert.nonNegativeSafeInteger(x.index, 'chunk.index');
  assert.nonNegativeSafeInteger(x.offset, 'chunk.offset');
  assert.sequence(x.sequence, 'chunk.sequence');
  assert.object(x.jwe, 'chunk.jwe');
}

function doc(x) {
  assert.object(x, 'doc');
  assert.localId(x.id, 'doc.id');
  assert.sequence(x.sequence, 'doc.sequence');
  assert.object(x.jwe, 'doc.jwe');
  if(x.indexed !== undefined) {
    assert.array(x.indexed, 'doc.indexed');
  }
}

function edvConfig(x) {
  assert.object(x, 'config');
  assert.string(x.id, 'config.id');
  assert.string(x.controller, 'config.controller');
  assert.sequence(x.sequence, 'config.sequence');

  assert.object(x.keyAgreementKey, 'config.keyAgreementKey');
  assert.object(x.hmac, 'config.hmac');
  if(x.keyAgreementKey) {
    assert.string(x.keyAgreementKey.id, 'config.keyAgreementKey.id');
    assert.string(x.keyAgreementKey.type, 'config.keyAgreementKey.type');
  }
  if(x.hmac) {
    assert.string(x.hmac.id, 'config.hmac.id');
    assert.string(x.hmac.type, 'config.hmac.type');
  }
}

function edvQuery(x, name) {
  assert.object(x, name);
  const {index, equals, has, count, limit} = x;
  assert.string(index, `${name}.index`);
  if(!!equals === !!has) {
    throw new TypeError(
      `"${name}" must contain exactly one of "equals" or "has".`);
  }
  if(equals !== undefined) {
    assert.array(equals, `${name}.equals`);
    if(equals.length === 0) {
      throw new Error(`"${name}.equals" must have of a length > 0.`);
    }
    // every `equals` entry must be an object w/key+value strings
    for(const [i, e] of equals.entries()) {
      const subName = `${name}.equals[${i}]`;
      assert.object(e, subName);
      for(const key in e) {
        assert.string(e[key], `${subName}.${key}`);
      }
    }
  }
  if(has !== undefined) {
    assert.array(has, `${name}.has`);
    if(has.length === 0) {
      throw new Error(`"${name}.equals" must have of a length > 0.`);
    }
    // every `has` entry must be a string
    for(const [i, e] of has.entries()) {
      assert.string(e, `${name}.equals[${i}]`);
    }
  }
  if(count !== undefined && typeof count !== 'boolean') {
    throw new TypeError(`"${name}.count" must be a boolean.`);
  }
  if(limit !== undefined) {
    assert.number(limit, `${name}.limit`);
    if(!(limit >= 1 && limit <= 1000)) {
      throw new Error(`"${name}.limit" must be an integer >= 1 and <= 1000.`);
    }
  }
}

function localId(x, name) {
  assert.string(x, name);

  try {
    // verify ID is base58-encoded multibase multihash encoded 16 bytes
    const buf = base58.decode(x.substr(1));
    // multibase base58 (starts with 'z')
    // 128-bit random number, identity multihash encoded
    // 0x00 = identity tag, 0x10 = length (16 bytes) + 16 random bytes
    if(!(x.startsWith('z') &&
      buf.length === 18 && buf[0] === 0x00 && buf[1] === 0x10)) {
      throw new Error('Invalid identifier.');
    }
  } catch(e) {
    const error = new Error(
      `Identifier "${x}" must be base58-encoded multibase, ` +
      'multihash array of 16 random bytes.');
    error.name = 'ConstraintError';
    throw error;
  }
}

function nonNegativeSafeInteger(x, name) {
  if(!(x >= 0 && Number.isSafeInteger(x))) {
    throw new TypeError(`"${name}" must be a non-negative safe integer.`);
  }
}

function number(x, name) {
  _assertType({x, name, type: 'number', article: 'a'});
}

function object(x, name) {
  _assertType({x, name, type: 'object', article: 'an', truthy: true});
}

function secretConfig(x) {
  assert.object(x, 'config');
  assert.string(x.id, 'config.id');
  assert.string(x.hmacId, 'config.hmacId');
  assert.string(x.keyAgreementKeyId, 'config.keyAgreementKeyId');
  assert.object(x.secret, 'config.secret');
  assert.string(x.secret.version, 'config.secret.version');
  if(x.secret.version !== '1') {
    throw new Error('"config.secret.version" must be "1".');
  }
  assert.string(x.secret.salt, 'config.secret.salt');
  assert.string(x.secret.wrappedKey, 'config.secret.wrappedKey');
  assert.sequence(x.sequence, 'config.sequence');
}

function sequence(x, name) {
  // `sequence` is limited to MAX_SAFE_INTEGER - 1
  assert.nonNegativeSafeInteger(x, name);
  if(x === Number.MAX_SAFE_INTEGER) {
    throw new TypeError(
      `"${name}" must be less than ${Number.MAX_SAFE_INTEGER}.`);
  }
}

function string(x, name) {
  _assertType({x, name, type: 'string', article: 'a'});
}

function uint8Array(x, name) {
  if(!(x instanceof Uint8Array)) {
    throw new TypeError(`"${name}" must be a Uint8Array.`);
  }
}

function _assertType({x, name, type, article, truthy}) {
  if(!(typeof x === type && (x || !truthy))) {
    throw new TypeError(`"${name}" must be ${article} ${type}.`);
  }
}
