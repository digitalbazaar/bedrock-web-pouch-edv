/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
// import local config
import './config.js';

import * as chunks from './chunks.js';
import * as docs from './docs.js';
import * as edvs from './edvs.js';

export {chunks, docs, edvs};
export {generateLocalId} from './helpers.js';

export async function initialize() {
  return Promise.all([
    chunks.initialize(),
    docs.initialize(),
    edvs.initialize()
  ]);
}
