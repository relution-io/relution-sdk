/*
 * @file index.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.04.2016
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
 * @preferred
 */
/** */

// make client compilation context contain globals
/// <reference path="../typings/globals/backbone-global/index.d.ts" />
/// <reference path="../typings/globals/backbone/index.d.ts" />
/// <reference path="../typings/globals/cordova/plugins/device/index.d.ts" />
/// <reference path="../typings/globals/jquery/index.d.ts" />
/// <reference path="../typings/globals/phonegap-plugin-push/index.d.ts" />
/// <reference path="../typings/globals/q/index.d.ts" />
/// <reference path="../typings/globals/socket.io-client/index.d.ts" />
/// <reference path="../typings/globals/websql/index.d.ts" />

// version
const pkgjson = require('../package.json');
const version = pkgjson.version;
export {version};

// aliases
export {debug} from './core/diag';
export {init} from './core/init';

// core module
export import core = require('./core');

// model module
export import model = require('./model');

// query module
export import query = require('./query');

// security module
export import security = require('./security');

// web module
export import web = require('./web');

// push module
export import push = require('./push');

// connector module
export import connector = require('./connector');

// livedata module
export import livedata = require('./livedata');
