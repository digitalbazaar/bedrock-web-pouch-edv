/*!
 * Copyright (c) 2021-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {assert} from './assert.js';
import PouchDB from 'pouchdb';
import pouchFind from 'pouchdb-find';
import pouchIndexedDB from 'pouchdb-adapter-indexeddb';

export {PouchDB};

const PREFIX = 'br_edv_';

// support queries and indexing
PouchDB.plugin(pouchFind);
// support native IndexedDB indexes
PouchDB.plugin(pouchIndexedDB);

/* Add some plugins to get pseudo-uniqueness properties. PouchDB does not have
some basic uniqueness primitives that other databases have. This includes no
ability to set unique constraints on custom indexes. These plugins provide
`insertOne` and `updateOne` APIs that approximate these behaviors but since the
system primitives are not present, they do not have atomic guarantees. */
PouchDB.plugin({insertOne, updateOne});

// enable for debugging purposes only
// import debugPouch from 'pouchdb-debug';
// debugPouch(PouchDB);
// PouchDB.debug.enable('pouchdb:find');

// create a pouch DB database w/auto-upgrade flag
export async function createDatabase({
  name, auto_compaction = true, adapter = 'indexeddb'
} = {}) {
  const client = new PouchDB(PREFIX + name, {
    auto_compaction,
    adapter
  });
  // force internal remote flag to false to avoid deprecation warnings
  client._remote = false;
  return client;
}

// purge all deleted documents in a pouch DB database
export async function purge({name} = {}) {
  // purge any deleted records to recover storage space
  let db;
  let deleted = 0;
  try {
    // apply prefixes to database name
    name = '_pouch_' + PREFIX + name;
    // open database and handle various events
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onblocked = event => {
        db = event.target.result;
        reject(new Error('Cannot purge right now; database access blocked.'));
      };
      request.onupgradeneeded = event => {
        db = event.target.result;
        reject(new Error('Nothing to purge; database not ready yet.'));
      };
      request.onsuccess = event => resolve(event.target.result);
      request.onerror = event => reject(event.target.error);
    });
    if(![...db.objectStoreNames].includes('docs')) {
      return;
    }
    const transaction = db.transaction(['docs'], 'readwrite');
    const transactionPromise = new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
    const objectStore = transaction.objectStore('docs');
    const request = objectStore.openCursor();
    let cursor = await _promisifyIDBInterface(request);
    while(cursor) {
      const {value} = cursor;
      if(value.deleted === 1) {
        await _promisifyIDBInterface(cursor.delete());
        deleted++;
      }
      const next = _promisifyIDBInterface(request);
      cursor.continue();
      cursor = await next;
    }
    await transactionPromise;
  } catch(e) {
    throw e;
  } finally {
    db?.close();
  }

  return {deleted};
}

/**
 * Inserts a document into a PouchDB database, if `doc._id` is unique and if
 * the selectors and options in the given `uniqueConstraints` array do not
 * return any results.
 *
 * @param {object} options - The options to use.
 * @param {object} options.doc - The document to insert.
 * @param {object} [options.uniqueConstraints] - Any additional uniqueness
 *   constraints to enforce beyond the `_id` index (each entry includes
 *   `selector` and `options`).
 *
 * @returns {Promise<object>} Resolves to the insert result.
 */
async function insertOne({doc, uniqueConstraints = []} = {}) {
  assert.object(doc, 'doc');
  assert.array(uniqueConstraints, 'uniqueConstraints');

  // build default unique constraints for `_id`
  if(doc._id) {
    uniqueConstraints = uniqueConstraints.slice();
    uniqueConstraints.push({selector: {_id: doc._id}});
  }

  // keep attempting insert whilst conflict errors arise -- this mitigates
  // concurrency issues w/`_id` (but not other unique constraints)
  while(true) {
    try {
      // check all uniqueness constraints
      const [existing] = await Promise.all(uniqueConstraints
        .map(({selector, options}) => _getExisting.call(
          this, {doc, selector, options})));
      if(existing) {
        // document already exists, throw error
        const error = new Error(
          'Could not insert document; uniqueness constraint violation.');
        error.name = 'ConstraintError';
        error.doc = doc;
        error.existing = existing;
        error.uniqueConstraints = uniqueConstraints;
        throw error;
      }

      // this is not atomic w/the unique contraints check, so if concurrent
      // processes update the same information the constraints may no longer
      // be met
      const result = await (doc._id ? this.put(doc) : this.post(doc));

      // build the full record
      const record = {
        ...doc,
        _id: result.id,
        _rev: result.rev
      };
      return {...result, record};
    } catch(e) {
      // only capture PouchErrors here, not local `ConstraintError`, the latter
      // should be thrown and stop this loop
      if(e.status === 409) {
        continue;
      }
      throw e;
    }
  }
}

/**
 * Updates a single document in the PouchDB database, if the selectors and
 * options in the given `uniqueConstraints` array return a single result and
 * the given `query` matches that same result. If `upsert` is set to `true`
 * and both the `query` does not match and there are no documents matching
 * the uniqueness constraints, the document will be inserted. If `doc._id` is
 * set then unique constraints for it will be auto-generated.
 *
 * @param {object} options - The options to use.
 * @param {object} options.doc - The document to update.
 * @param {object} options.query - The selector and options to use to query.
 * @param {boolean} [options.upsert=false] - `true` to insert the document
 *   if the query does not match, `false` if not.
 * @param {object} [options.uniqueConstraints] - Any additional uniqueness
 *   constraints to enforce beyond the `_id` index (each entry includes
 *   `selector` and `options`).
 *
 * @returns {Promise<object|boolean>} Resolves to the update result or
 *   `false` if `upsert=false` and no matching record was found.
 */
async function updateOne({
  doc, query, upsert = false, uniqueConstraints = []
} = {}) {
  // use a separate `uniqueConstraints` variable for updating (vs. inserting)
  // to avoid passing a modified version to `insertOne`
  let updateUniqueConstraints;

  // keep attempting update whilst conflict errors arise -- this mitigates
  // concurrency issues w/`_id` (but not other unique constraints)
  while(true) {
    try {
      // get matching record
      const {selector, options} = query;
      const existing = await _getExisting.call(this, {doc, selector, options});
      if(!existing) {
        if(!upsert) {
          // no match, and no insert requested, so nothing to update
          return false;
        }
        // attempt an insert
        return await this.insertOne({doc, uniqueConstraints});
      }

      // create unique constraints for update
      if(!updateUniqueConstraints) {
        if(!doc._id) {
          updateUniqueConstraints = uniqueConstraints;
        } else {
          updateUniqueConstraints = uniqueConstraints.slice();
          updateUniqueConstraints.push({selector: {_id: doc._id}});
        }
      }

      // check all uniqueness constraints
      const existingRecords = await Promise.all(updateUniqueConstraints
        .map(({selector, options}) => _getExisting.call(
          this, {doc, selector, options})));
      // ensure all matching records are the same as the existing record across
      // all uniqueness constraints, otherwise reject the update as it would
      // violate them
      for(const record of existingRecords) {
        if(existing._id !== record?._id) {
          const error = new Error(
            'Could not update document; uniqueness constraint violation.');
          error.name = 'ConstraintError';
          error.doc = doc;
          error.existing = record;
          error.uniqueConstraints = updateUniqueConstraints;
          throw error;
        }
      }

      /* Note: Sadly, this is not atomic with the unique contraints checks, so
      degenerate cases where concurrent inserts/updates are made may cause
      uniqueness violations. This is an accepted limitation of this
      implementation and the primitives currently offered by PouchDB. The
      remedy to this problem when it occurs is to update N-1 of the documents
      that duplicate each other in some way (to remove the duplication). */
      const result = await this.put({
        _id: existing._id,
        _rev: existing._rev,
        ...doc
      });

      // build the full record
      const record = {
        ...doc,
        _id: result.id,
        _rev: result.rev
      };
      return {...result, record};
    } catch(e) {
      // only capture PouchErrors here, not local `ConstraintError`, the latter
      // should be thrown and stop this loop
      if(e.status === 409) {
        continue;
      }
      throw e;
    }
  }
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
  entered a state with a unique constraints violation that must be remedied
  by updating N-1 of the documents that duplicate one another in some way (to
  remove the duplication). */
  const {docs: [existing]} = await this.find({
    selector, limit: 1, ...options
  });
  return existing;
}

function _promisifyIDBInterface(idbInterface) {
  return new Promise((resolve, reject) => {
    idbInterface.onsuccess = event => resolve(event.target.result);
    idbInterface.onerror = event => reject(event.target.error);
  });
}
