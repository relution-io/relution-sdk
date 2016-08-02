/**
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
"use strict";
var core = require('./core');
/**
 * lazy loads modules at runtime.
 *
 * An instance of Relution is set as prototype on the module exports. When a get property accessor
 * of an exposed member is read, a require statement is executed loading the actual implementation
 * code and the property is redefined to the resultant value.
 *
 * For supporting diagnostics, the core module is an exception and must be loaded eagerly.
 */
var Relution = (function () {
    function Relution() {
        // aliases
        this.init = core.init;
        this.debug = core.debug;
        // core module
        this.core = core;
    }
    Relution.resetProperty = function (property, value) {
        Object.defineProperty(exports, property, {
            value: value
        });
        return value;
    };
    ;
    Object.defineProperty(Relution.prototype, "version", {
        // version
        get: function () {
            core.debug.debug('lazy loading Relution.version...');
            var pkgjson = require('../package.json');
            return Relution.resetProperty('version', pkgjson.version);
        },
        enumerable: true,
        configurable: true
    });
    ;
    Object.defineProperty(Relution.prototype, "model", {
        // model module
        get: function () {
            core.debug.debug('lazy loading Relution.model...');
            return Relution.resetProperty('model', require('./model'));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Relution.prototype, "query", {
        // query module
        get: function () {
            core.debug.debug('lazy loading Relution.query...');
            return Relution.resetProperty('query', require('./query'));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Relution.prototype, "security", {
        // security module
        get: function () {
            core.debug.debug('lazy loading Relution.security...');
            return Relution.resetProperty('security', require('./security'));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Relution.prototype, "web", {
        // web module
        get: function () {
            core.debug.debug('lazy loading Relution.web...');
            return Relution.resetProperty('web', require('./web'));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Relution.prototype, "push", {
        // push module
        get: function () {
            core.debug.debug('lazy loading Relution.push...');
            return Relution.resetProperty('push', require('./push'));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Relution.prototype, "connector", {
        // connector module
        get: function () {
            core.debug.debug('lazy loading Relution.connector ...');
            return Relution.resetProperty('connector', require('./connector'));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Relution.prototype, "livedata", {
        // livedata module
        get: function () {
            core.debug.debug('lazy loading Relution.livedata ...');
            return Relution.resetProperty('livedata', require('./livedata'));
        },
        enumerable: true,
        configurable: true
    });
    return Relution;
}());
;
Object.setPrototypeOf(exports, new Relution());
//# sourceMappingURL=index.lazy.js.map