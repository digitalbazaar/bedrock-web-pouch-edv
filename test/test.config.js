/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {config} from '@bedrock/core';
import {createRequire} from 'module';
import path from 'path';

const require = createRequire(import.meta.url);

config.karma.config.webpack.resolve.fallback.events =
  require.resolve('events/');

config.karma.suites['bedrock-web-pouch-edv'] = path.join('web', '**', '*.js');
