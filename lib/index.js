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
"use strict";
// make client compilation context contain globals
/// <reference path="../typings/globals/backbone-global/index.d.ts" />
/// <reference path="../typings/globals/backbone/index.d.ts" />
/// <reference path="../typings/globals/cordova/plugins/device/index.d.ts" />
/// <reference path="../typings/globals/jquery/index.d.ts" />
/// <reference path="../typings/globals/mocha/index.d.ts" />
/// <reference path="../typings/globals/node/index.d.ts" />
/// <reference path="../typings/globals/phonegap-plugin-push/index.d.ts" />
/// <reference path="../typings/globals/q/index.d.ts" />
/// <reference path="../typings/globals/socket.io-client/index.d.ts" />
/// <reference path="../typings/globals/underscore/index.d.ts" />
/// <reference path="../typings/globals/websql/index.d.ts" />
// version
var pkgjson = require('../package.json');
var version = pkgjson.version;
exports.version = version;
// aliases
var diag_1 = require('./core/diag');
exports.debug = diag_1.debug;
var init_1 = require('./core/init');
exports.init = init_1.init;
// core module
exports.core = require('./core');
// model module
exports.model = require('./model');
// query module
exports.query = require('./query');
// security module
exports.security = require('./security');
// web module
exports.web = require('./web');
// push module
exports.push = require('./push');
// connector module
exports.connector = require('./connector');
// livedata module
exports.livedata = require('./livedata');
//# sourceMappingURL=index.js.map