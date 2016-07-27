/**
 * @file core/init.ts
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
"use strict";
var _ = require('lodash');
var Q = require('q');
var url = require('url');
var diag = require('./diag');
var device = require('./device');
// workaround Q promises being inherently incompatible with zone.js used by angular2
Q.nextTick = (function detectNextTick() {
    // requires use of Q's nextTick(cb)
    Q.stopUnhandledRejectionTracking();
    // Q's nextTick(cb) is not compatible with thread-locals,
    // returned function must not be bound as zone.js reassigns global variables
    if (process && !('browser' in process) && process.nextTick) {
        return function (cb) { return process.nextTick(cb); };
    }
    else if (typeof 'setImmediate' === 'function') {
        return function (cb) { return setImmediate(cb); };
    }
    else {
        return function (cb) { return setTimeout(cb, 0); };
    }
})();
// initialize to go in sync with init() call
Q.longStackSupport = diag.debug.enabled;
/**
 * creates a deeply independent copy of some [[ServerInitOptions]].
 *
 * @param serverInitOptions to clone.
 * @return {ServerInitOptions} cloned object.
 */
function cloneServerInitOptions(serverInitOptions) {
    var result = {
        serverUrl: serverInitOptions.serverUrl,
        application: serverInitOptions.application,
        clientApp: serverInitOptions.clientApp,
        tenantOrga: serverInitOptions.tenantOrga,
        logonCallback: serverInitOptions.logonCallback,
    };
    if (result.serverUrl && result.serverUrl[result.serverUrl.length - 1] !== '/') {
        result.serverUrl += '/';
    }
    if (serverInitOptions.clientCertificate) {
        result.clientCertificate = _.clone(serverInitOptions.clientCertificate);
    }
    if (serverInitOptions.agentOptions) {
        result.agentOptions = _.clone(serverInitOptions.agentOptions);
    }
    return result;
}
exports.cloneServerInitOptions = cloneServerInitOptions;
/**
 * copy of options the SDK was initialized with using [[init]] function serving as defaults.
 *
 * @internal for SDK internal use only!
 */
exports.initOptions = {};
/**
 * (re)initializes the SDK providing global configuration parameters.
 *
 * @param options of configuration, often these are hardcoded values of the mobile client app.
 * @return promise resolving to Information object as soon as the device is ready.
 */
function init(options) {
    if (options === void 0) { options = {}; }
    if ('debug' in options) {
        diag.debug.enabled = options.debug;
        Q.longStackSupport = options.debug;
    }
    if ('serverUrl' in options) {
        var myURL = url.parse(options.serverUrl);
        if (!myURL.protocol && !myURL.host) {
            return Q.reject(new Error(options.serverUrl + " is not an accepted Url, please add a Host and a Protocol."));
        }
    }
    _.assignWith(exports.initOptions, cloneServerInitOptions(options), function (left, right) { return _.isUndefined(right) ? left : right; });
    if ('push' in options) {
        exports.initOptions.push = _.cloneDeep(options.push);
    }
    return device.ready;
}
exports.init = init;
//# sourceMappingURL=init.js.map