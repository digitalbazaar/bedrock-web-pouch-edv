/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as chunks from './chunks.js';
import * as docs from './docs.js';
import * as edvs from './edvs.js';
import * as secrets from './secrets.js';

/**
 * Initializes all databases required to work with local EDVs.
 *
 * @returns {Promise} Settles once the operation completes.
 */
export async function initialize() {
  return Promise.all([
    chunks.initialize(),
    docs.initialize(),
    edvs.initialize(),
    secrets.initialize()
  ]);
}
