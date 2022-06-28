/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {config} from '@bedrock/core';
import {createRequire} from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);

config.karma.suites['bedrock-web-pouch-edv'] = path.join('web', '**', '*.js');

config.karma.config.webpack.resolve.fallback.events =
  require.resolve('events/');

