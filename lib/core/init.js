/**
 * @file core/init.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.04.2016
 * Copyright (c)
 * 2016
 * M-Way Solutions GmbH. All rights reserved.
 * http://www.mwaysolutions.com
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";
var _ = require('lodash');
var Q = require('q');
var diag = require('./diag');
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
        clientapp: serverInitOptions.clientapp,
        tenantorga: serverInitOptions.tenantorga,
        logonCallback: serverInitOptions.logonCallback,
    };
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
 */
function init(options) {
    if (options === void 0) { options = {}; }
    if ('debug' in options) {
        diag.debug.enabled = options.debug;
        Q.longStackSupport = options.debug;
    }
    _.assign(exports.initOptions, cloneServerInitOptions(options));
}
exports.init = init;
//# sourceMappingURL=init.js.map