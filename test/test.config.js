/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {config} = require('bedrock');
const path = require('path');

config.karma.suites['bedrock-web-pouch-edv'] = path.join('web', '**', '*.js');

// disable babel preprocessing during karma tests to avoid
// errors with dated bedrock-karma and features like spread operator
config.karma.defaults.DEFAULT_PREPROCESSORS = ['webpack'];
