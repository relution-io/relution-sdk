/**
 * @file livedata/SyncEndpoint.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 07.12.2015
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
var urls = require('../web/urls');
var URLUtil = require('./url');
/**
 * manages connection of SyncStore to one entity.
 */
var SyncEndpoint = (function () {
    function SyncEndpoint(options) {
        this.isConnected = null;
        this.entity = options.entity;
        this.modelType = options.modelType;
        this.urlRoot = options.urlRoot;
        this.socketPath = options.socketPath;
        this.userUuid = options.userUuid;
        var href = URLUtil.getLocation(options.urlRoot);
        this.host = href.protocol + '//' + href.host;
        this.path = href.pathname;
        var user = options.userUuid ? options.userUuid + '/' : '';
        var name = options.entity;
        var hash = URLUtil.hashLocation(urls.resolveServer(options.urlRoot, options));
        this.channel = user + name + '/' + hash;
    }
    /**
     * close the endpoint explicit.
     */
    SyncEndpoint.prototype.close = function () {
        if (this.socket) {
            // consider calling this.socket.close() instead
            this.socket.socket.close();
            this.socket = null;
        }
        if (this.localStore) {
            this.localStore.close();
            this.localStore = null;
        }
    };
    return SyncEndpoint;
}());
exports.SyncEndpoint = SyncEndpoint;
//# sourceMappingURL=SyncEndpoint.js.map