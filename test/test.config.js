/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {config} = require('bedrock');
const path = require('path');

// allow self-signed certs in test framework
config['https-agent'].rejectUnauthorized = false;

config.karma.suites['bedrock-web-pouch-edv'] = path.join('web', '**', '*.js');

// FIXME: remove me; disables babel preprocessing
config.karma.defaults.DEFAULT_PREPROCESSORS = ['webpack'];
