/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */
import PouchDB from 'pouchdb';
import pouchFind from 'pouchdb-find';

export {PouchDB};

// support queries and indexing
PouchDB.plugin(pouchFind);

/* Add some plugins to get pseudo-uniqueness properties. PouchDB does not have
some basic uniqueness primitives that other databases have. This includes no
ability to set unique constraints on custom indexes, nor the ability to receive
an error when inserting a document that duplicates another in the database,
even for the built-in unique indexed property `_id`. These plugins provide
`insert` and `update` APIs that approximate these behaviors but since the
system primitives are not present, they do not have atomic guarantees. */
PouchDB.plugin({insertOne, updateOne});

// enable for debugging purposes only
// import debugPouch from 'pouchdb-debug';
// debugPouch(PouchDB);
// PouchDB.debug.enable('pouchdb:find');

/**
 * Inserts a document into a PouchDB database, if the given `selector` does not
 * return any results. A `selector` may be omitted if `doc._id` is set (and
 * its value will be used to generate a default `selector`).
 *
 * @param {object} options - The options to use.
 * @param {object} options.doc - The document to insert.
 * @param {object} [options.selector] - The selector to use.
 *
 * @returns {Promise<object>} Resolves to the insert result.
 */
async function insertOne({doc, selector} = {}) {
  const existing = await _getExisting.call(this, {doc, selector});
  if(existing) {
    // document already exists, throw error
    const error = new Error(
      'Could not insert document; uniqueness constraint violation.');
    error.name = 'ConstraintError';
    error.selector = selector;
    throw error;
  }

  // sadly, this is not atomic, so another concurrent process may either
  // have its insert overwritten or this process's insert may be
  let result;
  if(doc._id) {
    result = await this.put(doc);
  } else {
    result = await this.post(doc);
  }

  // build the full record
  const record = {
    _id: result._id,
    _rev: result._rev,
    ...doc
  };
  return {...result, record};
}

/**
 * Updates a single document in the PouchDB database, if the given `selector`
 * matches at least one result. A `selector` may be omitted if `doc._id` is set
 * (and its value will be used to generate a default `selector`).
 *
 * @param {object} options - The options to use.
 * @param {object} options.doc - The document to update.
 * @param {object} [options.selector] - The selector to use.
 *
 * @returns {Promise<object>} Resolves to the update result.
 */
async function updateOne({doc, selector} = {}) {
  const existing = await _getExisting.call(this, {doc, selector});
  if(existing) {
    // nothing to update
    return false;
  }

  // sadly, this is not atomic, so the selector may actually no longer match
  // when this update is applied
  if(!doc._id) {
    doc = {_id: existing._id, ...doc};
  }
  const result = await this.put(doc);

  // build the full record
  const record = {
    _id: result._id,
    _rev: result._rev,
    ...doc
  };
  return {...result, record};
}

async function _getExisting({doc, selector}) {
  if(!selector && !doc._id) {
    throw new Error('Either "selector" or "doc._id" must be set.');
  }

  const {docs: [existing]} = await this.find({selector});
  return existing;
}
