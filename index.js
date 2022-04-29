/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */

// translate `main.js` to CommonJS
require = require('esm')(module);
module.exports = require('./lib/main.js');
