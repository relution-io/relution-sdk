/**
 * @file security/server.ts
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
var url = require('url');
var assert = require('assert');
var init = require('../core/init');
var auth = require('./auth');
var roles = require('./roles');
/**
 * computes a url from a given path.
 *
 * - absolute URLs are used as is, e.g.
 *   ``http://192.168.0.10:8080/mway/myapp/api/v1/some_endpoint`` stays as is,
 * - machine-relative URLs beginning with ``/`` are resolved against the Relution server logged
 *   into, so that ``/gofer/.../rest/...``-style URLs work as expected, for example
 *   ``/mway/myapp/api/v1/some_endpoint`` resolves as above when logged into
 *   ``http://192.168.0.10:8080``,
 * - context-relative URLs such as ``api/v1/...`` are resolved using the Relution server logged in,
 *   the ``uniqueName`` of the ``currentOrganization`` and the application name, for example
 *   ``api/v1/some_endpoint`` resolves as above when application myapp logged into
 *   ``http://192.168.0.10:8080`` using a user of organization mway provided currentOrganization
 *   was not changed explicitly to something else.
 *
 * @param path optional path to resolve.
 * @return {string} absolute URL of path on current server.
 */
function resolveUrl(path, serverUrl) {
    if (serverUrl === void 0) { serverUrl = init.initOptions.serverUrl; }
    if (!serverUrl) {
        return path;
    }
    if (!path) {
        return serverUrl;
    }
    return url.resolve(serverUrl, path);
}
exports.resolveUrl = resolveUrl;
/**
 * per-server state management.
 *
 * @internal for library use only.
 */
var Server = (function () {
    function Server(serverUrl) {
        // security state
        this.state = {
            authorization: auth.ANONYMOUS_AUTHORIZATION,
            organization: null,
            user: null,
            credentials: null
        };
        this.options = init.cloneServerUrlOptions(init.initOptions);
        this.options.serverUrl = serverUrl;
    }
    Server.getInstance = function (serverUrl) {
        if (serverUrl === void 0) { serverUrl = init.initOptions.serverUrl; }
        if (!serverUrl) {
            throw new Error('no server set');
        }
        var server = Server.servers[serverUrl];
        if (!server) {
            server = new Server(serverUrl);
            Server.servers[serverUrl] = server;
        }
        return server;
    };
    Server.prototype.makeCurrent = function () {
        init.initOptions.serverUrl = this.options.serverUrl;
    };
    Object.defineProperty(Server.prototype, "authorization", {
        get: function () {
            return this.state.authorization;
        },
        set: function (authorization) {
            if (authorization && authorization != auth.ANONYMOUS_AUTHORIZATION) {
                this.state.authorization = auth.freezeAuthorization(authorization);
            }
            else {
                this.state.authorization = auth.ANONYMOUS_AUTHORIZATION;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Server.prototype, "organization", {
        get: function () {
            return this.state.organization;
        },
        set: function (organization) {
            if (organization) {
                this.state.organization = roles.freezeOrganization(organization);
            }
            else {
                this.state.organization = null;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Server.prototype, "user", {
        get: function () {
            return this.state.user;
        },
        set: function (user) {
            if (user) {
                this.state.user = roles.freezeUser(user);
            }
            else {
                this.state.user = null;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Server.prototype, "credentials", {
        get: function () {
            return this.state.credentials;
        },
        set: function (credentials) {
            if (credentials) {
                this.state.credentials = auth.freezeCredentials(auth.cloneCredentials(credentials));
            }
            else {
                this.state.credentials = null;
            }
        },
        enumerable: true,
        configurable: true
    });
    /**
     * servers by url.
     */
    Server.servers = {};
    return Server;
}());
exports.Server = Server;
/**
 * gets the current [[Server]].
 *
 * @param serverUrl to get state of.
 * @return {Server} state parameter.
 */
function getCurrentServer() {
    return Server.getInstance();
}
exports.getCurrentServer = getCurrentServer;
/**
 * sets the current [[Server]].
 *
 * @param server to set state of.
 */
function setCurrentServer(server) {
    if (server) {
        server.makeCurrent();
        assert.strictEqual(getCurrentServer(), server);
    }
    else {
        init.initOptions.serverUrl = null;
    }
}
exports.setCurrentServer = setCurrentServer;
/**
 * gets the [[Authorization]] in effect.
 *
 * @return {Authorization} in effect, may be null.
 */
function getCurrentAuthorization() {
    return getCurrentServer().authorization;
}
exports.getCurrentAuthorization = getCurrentAuthorization;
/**
 * gets the [[Organization]] in effect.
 *
 * @param fields of interest.
 * @return {Organization} in effect, may be null.
 */
function getCurrentOrganization() {
    var fields = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        fields[_i - 0] = arguments[_i];
    }
    return getCurrentServer().organization;
}
exports.getCurrentOrganization = getCurrentOrganization;
/**
 * sets the [[Organization]].
 *
 * @param organization to set.
 */
function setCurrentOrganization(organization) {
    getCurrentServer().organization = organization;
    assert.equal(getCurrentOrganization(), organization);
}
exports.setCurrentOrganization = setCurrentOrganization;
/**
 * gets the [[User]] in effect.
 *
 * @param fields of interest.
 * @return {User} in effect, may be null.
 */
function getCurrentUser() {
    var fields = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        fields[_i - 0] = arguments[_i];
    }
    return getCurrentServer().user;
}
exports.getCurrentUser = getCurrentUser;
//# sourceMappingURL=server.js.map