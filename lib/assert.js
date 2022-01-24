/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
export const assert = {array, number, object, string};

function array(x, name) {
  if(!(x && Array.isArray(x))) {
    throw new TypeError(`"${name}" must be an array.`);
  }
}

function number(x, name) {
  _assertType({x, name, type: 'number', article: 'a'});
}

function object(x, name) {
  _assertType({x, name, type: 'object', article: 'an', truthy: true});
}

function string(x, name) {
  _assertType({x, name, type: 'string', article: 'a'});
}

function _assertType({x, name, type, article, truthy}) {
  if(typeof x !== type || !(x && truthy)) {
    throw new TypeError(`"${name}" must be ${article} ${type}.`);
  }
}
