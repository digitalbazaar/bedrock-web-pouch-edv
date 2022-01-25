/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from './assert.js';
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
 * Inserts a document into a PouchDB database, if the selectors and options
 * in the given `uniqueConstraints` array do not return any results. A
 * `selector` may be omitted if `doc._id` is set (and its value will be used to
 * generate a default `selector`).
 *
 * @param {object} options - The options to use.
 * @param {object} options.doc - The document to insert.
 * @param {object} [options.uniqueConstraints] - The uniqueness constraints to
 *   enforce (each entry includes `selector` and `options`).
 *
 * @returns {Promise<object>} Resolves to the insert result.
 */
async function insertOne({doc, uniqueConstraints = [{}]} = {}) {
  assert.object(doc, 'doc');
  assert.array(uniqueConstraints, 'uniqueConstraints');

  // check all uniqueness constraints
  const [existing] = await Promise.all(uniqueConstraints
    .map(({selector, options}) => _getExisting.call(
      this, {doc, selector, options})));
  if(existing) {
    // document already exists, throw error
    const error = new Error(
      'Could not insert document; uniqueness constraint violation.');
    error.name = 'ConstraintError';
    error.uniqueConstraints = uniqueConstraints;
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
 * Updates a single document in the PouchDB database, if the selectors and
 * options in the given `uniqueConstraints` array return a single result and
 * the given `query` matches that same result. A `selector` may be omitted
 * if `doc._id` is set (and its value will be used to generate a default
 * `selector`).
 *
 * @param {object} options - The options to use.
 * @param {object} options.doc - The document to update.
 * @param {object} options.query - The selector and options to use to query.
 * @param {object} [options.uniqueConstraints] - The uniqueness constraints to
 *   enforce (each entry includes `selector` and `options`).
 *
 * @returns {Promise<object>} Resolves to the update result.
 */
async function updateOne({doc, query, uniqueConstraints} = {}) {
  // get matching record
  const {selector, options} = query;
  const existing = await _getExisting.call(this, {doc, selector, options});
  if(!existing) {
    // no match, nothing to update
    return false;
  }

  // check all uniqueness constraints
  const existingRecords = await Promise.all(uniqueConstraints
    .map(({selector, options}) => _getExisting.call(
      this, {doc, selector, options})));
  // ensure all matching records are the same as the existing record across all
  // uniqueness constraints, otherwise reject the update as it would violate
  // them
  for(const record of existingRecords) {
    if(existing._id !== record._id) {
      const error = new Error(
        'Could not update document; uniqueness constraint violation.');
      error.name = 'ConstraintError';
      error.uniqueConstraints = uniqueConstraints;
      throw error;
    }
  }

  // sadly, this is not atomic, so degenerate cases where concurrent updates
  // are made may cause the selector to no longer match when this update is
  // applied; this is an accepted limitation of this implementation and the
  // primitives currently offered by PouchDB
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

async function _getExisting({doc, selector, options}) {
  if(!selector && !doc._id) {
    throw new Error('Either "selector" or "doc._id" must be set.');
  }

  // set default selector
  if(!selector) {
    selector = {_id: doc._id};
  }

  /* Note: The calls that use this helper function expect a single document
  to be returned. Those calls are either updating a single document or are
  checking for uniqueness. If we are updating a single document, any document
  will do (to be returned).

  In the case of a uniqueness check, we presume a single document will be
  returned at most from a query based on unique constraints. This will only not
  be the case if the lack of atomic primitives for enforcing uniqueness have
  been violated via concurrent inserts/updates. In that case, the database has
  entered an indeterminate state that is not presently handled by this
  implementation. */
  const {docs: [existing]} = await this.find({selector, options});
  return existing;
}
