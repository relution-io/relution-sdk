/*
 * @file index.lazy.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 22.07.2016
 * Copyright 2016 M-Way Solutions GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @module Relution
 */
/** */

import * as index from './index';
import * as core from './core';

/**
 * lazy loads modules at runtime.
 *
 * An instance of Relution is set as prototype on the module exports. When a get property accessor
 * of an exposed member is read, a require statement is executed loading the actual implementation
 * code and the property is redefined to the resultant value.
 *
 * For supporting diagnostics, the core module is an exception and must be loaded eagerly.
 */
class Relution {

  private static resetProperty<T>(property: string, value: T): T {
    Object.defineProperty(exports, property, {
      value: value
    });
    return value;
  };

// version
  get version(): typeof index.version {
    core.debug.debug('lazy loading Relution.version...');
    const pkgjson = require('../package.json');
    return Relution.resetProperty('version', pkgjson.version);
  };

// aliases
  init: typeof index.init = core.init;
  debug: typeof index.debug = core.debug;

// core module
  core: typeof index.core = core;

// model module
  get model(): typeof index.model {
    core.debug.debug('lazy loading Relution.model...');
    return Relution.resetProperty('model', require('./model'));
  }

// query module
  get query(): typeof index.query {
    core.debug.debug('lazy loading Relution.query...');
    return Relution.resetProperty('query', require('./query'));
  }

// security module
  get security(): typeof index.security {
    core.debug.debug('lazy loading Relution.security...');
    return Relution.resetProperty('security', require('./security'));
  }

// web module
  get web(): typeof index.web {
    core.debug.debug('lazy loading Relution.web...');
    return Relution.resetProperty('web', require('./web'));
  }

// push module
  get push(): typeof index.push {
    core.debug.debug('lazy loading Relution.push...');
    return Relution.resetProperty('push', require('./push'));
  }

// connector module
  get connector(): typeof index.connector {
    core.debug.debug('lazy loading Relution.connector ...');
    return Relution.resetProperty('connector', require('./connector'));
  }

// livedata module
  get livedata(): typeof index.livedata {
    core.debug.debug('lazy loading Relution.livedata ...');
    return Relution.resetProperty('livedata', require('./livedata'));
  }

};

(<any>Object).setPrototypeOf(exports, new Relution());
