/*
 * @file security/server.ts
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
 * @module security
 */
/** */
"use strict";
var assert = require('assert');
var _ = require('lodash');
var init = require('../core/init');
var diag = require('../core/diag');
var auth = require('./auth');
var roles = require('./roles');
var online = require('../web/online');
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
            credentials: null,
            serverInfos: null
        };
        this.options = init.cloneServerInitOptions(init.initOptions);
        this.options.serverUrl = serverUrl;
    }
    Server.getInstance = function (serverUrl) {
        if (serverUrl === void 0) { serverUrl = init.initOptions.serverUrl; }
        if (!serverUrl) {
            throw new Error('no server set');
        }
        diag.debug.assert(function () { return serverUrl[serverUrl.length - 1] === '/'; }, serverUrl);
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
    /**
     * used to update options.
     *
     * @param opts to apply.
     * @return {*} updated options.
     */
    Server.prototype.applyOptions = function (serverInitOptions) {
        var _this = this;
        diag.debug.assert(function () { return _this.options.serverUrl === serverInitOptions.serverUrl; });
        return _.assignWith(this.options, serverInitOptions, function (left, right) { return _.isUndefined(right) ? left : right; });
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
                if (!this.options.tenantOrga) {
                    this.options.tenantOrga = organization.uniqueName;
                }
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
    Object.defineProperty(Server.prototype, "serverInfos", {
        get: function () {
            return this.state.serverInfos;
        },
        set: function (serverInfos) {
            if (serverInfos) {
                this.state.serverInfos = online.freezeServerInformation(serverInfos);
            }
            else {
                this.state.serverInfos = null;
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
 *
 * @internal for library use only.
 */
function getCurrentServer() {
    return Server.getInstance();
}
exports.getCurrentServer = getCurrentServer;
/**
 * sets the current [[Server]].
 *
 * @param server to set state of.
 *
 * @internal for library use only.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3NlY3VyaXR5L3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksTUFBTSxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQ2pDLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRTVCLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQ3JDLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBRXJDLElBQVksSUFBSSxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQy9CLElBQVksS0FBSyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBRWpDLElBQVksTUFBTSxXQUFNLGVBQWUsQ0FBQyxDQUFBO0FBRXhDOzs7O0dBSUc7QUFDSDtJQThERSxnQkFBWSxTQUFpQjtRQS9CN0IsaUJBQWlCO1FBQ1QsVUFBSyxHQWlCVDtZQUNGLGFBQWEsRUFBRSxJQUFJLENBQUMsdUJBQXVCO1lBQzNDLFlBQVksRUFBRSxJQUFJO1lBQ2xCLElBQUksRUFBRSxJQUFJO1lBQ1YsV0FBVyxFQUFFLElBQUk7WUFDakIsV0FBVyxFQUFFLElBQUk7U0FDbEIsQ0FBQztRQVFBLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDckMsQ0FBQztJQXhEYSxrQkFBVyxHQUF6QixVQUEwQixTQUE4QztRQUE5Qyx5QkFBOEMsR0FBOUMsWUFBb0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTO1FBQ3RFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENB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QUFDLGdCQUFnQixFQUFFLENBQUMsSUFBSSxDQUFDO0FBQ2pDLENBQUM7QUFGZSxzQkFBYyxpQkFFN0IsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXHJcbiAqIEBmaWxlIHNlY3VyaXR5L3NlcnZlci50c1xyXG4gKiBSZWx1dGlvbiBTREtcclxuICpcclxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMjguMDQuMjAxNlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBtb2R1bGUgc2VjdXJpdHlcclxuICovXHJcbi8qKiAqL1xyXG5cclxuaW1wb3J0ICogYXMgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XHJcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcclxuXHJcbmltcG9ydCAqIGFzIGluaXQgZnJvbSAnLi4vY29yZS9pbml0JztcclxuaW1wb3J0ICogYXMgZGlhZyBmcm9tICcuLi9jb3JlL2RpYWcnO1xyXG5cclxuaW1wb3J0ICogYXMgYXV0aCBmcm9tICcuL2F1dGgnO1xyXG5pbXBvcnQgKiBhcyByb2xlcyBmcm9tICcuL3JvbGVzJztcclxuXHJcbmltcG9ydCAqIGFzIG9ubGluZSBmcm9tICcuLi93ZWIvb25saW5lJztcclxuXHJcbi8qKlxyXG4gKiBwZXItc2VydmVyIHN0YXRlIG1hbmFnZW1lbnQuXHJcbiAqXHJcbiAqIEBpbnRlcm5hbCBmb3IgbGlicmFyeSB1c2Ugb25seS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBTZXJ2ZXIge1xyXG5cclxuICAvKipcclxuICAgKiBzZXJ2ZXJzIGJ5IHVybC5cclxuICAgKi9cclxuICBwcml2YXRlIHN0YXRpYyBzZXJ2ZXJzOiB7XHJcbiAgICBbdXJsOiBzdHJpbmddOiBTZXJ2ZXI7XHJcbiAgfSA9IHt9O1xyXG5cclxuICBwdWJsaWMgc3RhdGljIGdldEluc3RhbmNlKHNlcnZlclVybDogc3RyaW5nID0gaW5pdC5pbml0T3B0aW9ucy5zZXJ2ZXJVcmwpOiBTZXJ2ZXIge1xyXG4gICAgaWYgKCFzZXJ2ZXJVcmwpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyBzZXJ2ZXIgc2V0Jyk7XHJcbiAgICB9XHJcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBzZXJ2ZXJVcmxbc2VydmVyVXJsLmxlbmd0aCAtIDFdID09PSAnLycsIHNlcnZlclVybCk7XHJcbiAgICBsZXQgc2VydmVyID0gU2VydmVyLnNlcnZlcnNbc2VydmVyVXJsXTtcclxuICAgIGlmICghc2VydmVyKSB7XHJcbiAgICAgIHNlcnZlciA9IG5ldyBTZXJ2ZXIoc2VydmVyVXJsKTtcclxuICAgICAgU2VydmVyLnNlcnZlcnNbc2VydmVyVXJsXSA9IHNlcnZlcjtcclxuICAgIH1cclxuICAgIHJldHVybiBzZXJ2ZXI7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgbWFrZUN1cnJlbnQoKSB7XHJcbiAgICBpbml0LmluaXRPcHRpb25zLnNlcnZlclVybCA9IHRoaXMub3B0aW9ucy5zZXJ2ZXJVcmw7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBjdXJyZW50IHNldCBvZiBvcHRpb25zIGluIGVmZmVjdCBmb3IgdGhpcyBzZXJ2ZXIuXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBvcHRpb25zOiBpbml0LlNlcnZlckluaXRPcHRpb25zO1xyXG5cclxuICAvLyBzZWN1cml0eSBzdGF0ZVxyXG4gIHByaXZhdGUgc3RhdGU6IHtcclxuICAgIGF1dGhvcml6YXRpb246IGF1dGguQXV0aG9yaXphdGlvbixcclxuICAgIC8qKlxyXG4gICAgICogc3RvcmFnZSBvZiBbW09yZ2FuaXphdGlvbl1dIGluIGVmZmVjdC5cclxuICAgICAqXHJcbiAgICAgKiBVc2VzIG51bGwgaW5zdGVhZCBvZiB7fSBmb3IgZW1wdHkgdmFsdWUgc28geW91IGNhbiB0ZXN0IHVzaW5nIGlmIHN0YXRlbWVudCB2aWEgY29oZXJzaW9uIHRvXHJcbiAgICAgKiBib29sZWFuLlxyXG4gICAgICpcclxuICAgICAqIEB0eXBlIHtPcmdhbml6YXRpb259IGluIGVmZmVjdCwgbWF5IGJlIG51bGwuXHJcbiAgICAgKi9cclxuICAgIG9yZ2FuaXphdGlvbjogcm9sZXMuT3JnYW5pemF0aW9uLFxyXG4gICAgdXNlcjogcm9sZXMuVXNlcixcclxuICAgIC8qKlxyXG4gICAgICogY29weSBvZiBjcmVkZW50aWFscyByZXF1aXJlZCBmb3IgcmVlc3RhYmxpc2hpbmcgdGhlIHNlc3Npb24gd2hlbiBpdCB0aW1lZCBvdXQsIGZvciBleGFtcGxlLlxyXG4gICAgICovXHJcbiAgICBjcmVkZW50aWFsczogYXV0aC5DcmVkZW50aWFscyxcclxuICAgIHNlcnZlckluZm9zOiBvbmxpbmUuU2VydmVySW5mb3JtYXRpb25cclxuICB9ID0ge1xyXG4gICAgYXV0aG9yaXphdGlvbjogYXV0aC5BTk9OWU1PVVNfQVVUSE9SSVpBVElPTixcclxuICAgIG9yZ2FuaXphdGlvbjogbnVsbCxcclxuICAgIHVzZXI6IG51bGwsXHJcbiAgICBjcmVkZW50aWFsczogbnVsbCxcclxuICAgIHNlcnZlckluZm9zOiBudWxsXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogbGFzdCBzZWVuIFgtR29mZXItVXNlciBoZWFkZXIgdmFsdWUgaW5kaWNhdGluZyBhIHNlcnZlciBzZXNzaW9uLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBzZXNzaW9uVXNlclV1aWQ6IHN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3Ioc2VydmVyVXJsOiBzdHJpbmcpIHtcclxuICAgIHRoaXMub3B0aW9ucyA9IGluaXQuY2xvbmVTZXJ2ZXJJbml0T3B0aW9ucyhpbml0LmluaXRPcHRpb25zKTtcclxuICAgIHRoaXMub3B0aW9ucy5zZXJ2ZXJVcmwgPSBzZXJ2ZXJVcmw7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiB1c2VkIHRvIHVwZGF0ZSBvcHRpb25zLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIG9wdHMgdG8gYXBwbHkuXHJcbiAgICogQHJldHVybiB7Kn0gdXBkYXRlZCBvcHRpb25zLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBhcHBseU9wdGlvbnMoc2VydmVySW5pdE9wdGlvbnM6IGluaXQuU2VydmVySW5pdE9wdGlvbnMpOiBpbml0LlNlcnZlckluaXRPcHRpb25zIHtcclxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHRoaXMub3B0aW9ucy5zZXJ2ZXJVcmwgPT09IHNlcnZlckluaXRPcHRpb25zLnNlcnZlclVybCk7XHJcbiAgICByZXR1cm4gXy5hc3NpZ25XaXRoKHRoaXMub3B0aW9ucywgc2VydmVySW5pdE9wdGlvbnMsIChsZWZ0OiBhbnksIHJpZ2h0OiBhbnkpID0+IF8uaXNVbmRlZmluZWQocmlnaHQpID8gbGVmdCA6IHJpZ2h0KTtcclxuICB9XHJcblxyXG4gIGdldCBhdXRob3JpemF0aW9uKCk6IGF1dGguQXV0aG9yaXphdGlvbiB7XHJcbiAgICByZXR1cm4gdGhpcy5zdGF0ZS5hdXRob3JpemF0aW9uO1xyXG4gIH1cclxuICBzZXQgYXV0aG9yaXphdGlvbihhdXRob3JpemF0aW9uOiBhdXRoLkF1dGhvcml6YXRpb24pIHtcclxuICAgIGlmIChhdXRob3JpemF0aW9uICYmIGF1dGhvcml6YXRpb24gIT0gYXV0aC5BTk9OWU1PVVNfQVVUSE9SSVpBVElPTikge1xyXG4gICAgICB0aGlzLnN0YXRlLmF1dGhvcml6YXRpb24gPSBhdXRoLmZyZWV6ZUF1dGhvcml6YXRpb24oYXV0aG9yaXphdGlvbik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLnN0YXRlLmF1dGhvcml6YXRpb24gPSBhdXRoLkFOT05ZTU9VU19BVVRIT1JJWkFUSU9OO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0IG9yZ2FuaXphdGlvbigpOiByb2xlcy5Pcmdhbml6YXRpb24ge1xyXG4gICAgcmV0dXJuIHRoaXMuc3RhdGUub3JnYW5pemF0aW9uO1xyXG4gIH1cclxuICBzZXQgb3JnYW5pemF0aW9uKG9yZ2FuaXphdGlvbjogcm9sZXMuT3JnYW5pemF0aW9uKSB7XHJcbiAgICBpZiAob3JnYW5pemF0aW9uKSB7XHJcbiAgICAgIHRoaXMuc3RhdGUub3JnYW5pemF0aW9uID0gcm9sZXMuZnJlZXplT3JnYW5pemF0aW9uKG9yZ2FuaXphdGlvbik7XHJcbiAgICAgIGlmICghdGhpcy5vcHRpb25zLnRlbmFudE9yZ2EpIHtcclxuICAgICAgICB0aGlzLm9wdGlvbnMudGVuYW50T3JnYSA9IG9yZ2FuaXphdGlvbi51bmlxdWVOYW1lO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLnN0YXRlLm9yZ2FuaXphdGlvbiA9IG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXQgdXNlcigpOiByb2xlcy5Vc2VyIHtcclxuICAgIHJldHVybiB0aGlzLnN0YXRlLnVzZXI7XHJcbiAgfVxyXG4gIHNldCB1c2VyKHVzZXI6IHJvbGVzLlVzZXIpIHtcclxuICAgIGlmICh1c2VyKSB7XHJcbiAgICAgIHRoaXMuc3RhdGUudXNlciA9IHJvbGVzLmZyZWV6ZVVzZXIodXNlcik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLnN0YXRlLnVzZXIgPSBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0IGNyZWRlbnRpYWxzKCk6IGF1dGguQ3JlZGVudGlhbHMge1xyXG4gICAgcmV0dXJuIHRoaXMuc3RhdGUuY3JlZGVudGlhbHM7XHJcbiAgfVxyXG4gIHNldCBjcmVkZW50aWFscyhjcmVkZW50aWFsczogYXV0aC5DcmVkZW50aWFscykge1xyXG4gICAgaWYgKGNyZWRlbnRpYWxzKSB7XHJcbiAgICAgIHRoaXMuc3RhdGUuY3JlZGVudGlhbHMgPSBhdXRoLmZyZWV6ZUNyZWRlbnRpYWxzKGF1dGguY2xvbmVDcmVkZW50aWFscyhjcmVkZW50aWFscykpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5zdGF0ZS5jcmVkZW50aWFscyA9IG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXQgc2VydmVySW5mb3MoKTogb25saW5lLlNlcnZlckluZm9ybWF0aW9uIHtcclxuICAgIHJldHVybiB0aGlzLnN0YXRlLnNlcnZlckluZm9zO1xyXG4gIH1cclxuICBzZXQgc2VydmVySW5mb3Moc2VydmVySW5mb3M6IG9ubGluZS5TZXJ2ZXJJbmZvcm1hdGlvbikge1xyXG4gICAgaWYgKHNlcnZlckluZm9zKSB7XHJcbiAgICAgIHRoaXMuc3RhdGUuc2VydmVySW5mb3MgPSBvbmxpbmUuZnJlZXplU2VydmVySW5mb3JtYXRpb24oc2VydmVySW5mb3MpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5zdGF0ZS5zZXJ2ZXJJbmZvcyA9IG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxufVxyXG5cclxuLyoqXHJcbiAqIGdldHMgdGhlIGN1cnJlbnQgW1tTZXJ2ZXJdXS5cclxuICpcclxuICogQHBhcmFtIHNlcnZlclVybCB0byBnZXQgc3RhdGUgb2YuXHJcbiAqIEByZXR1cm4ge1NlcnZlcn0gc3RhdGUgcGFyYW1ldGVyLlxyXG4gKlxyXG4gKiBAaW50ZXJuYWwgZm9yIGxpYnJhcnkgdXNlIG9ubHkuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q3VycmVudFNlcnZlcigpOiBTZXJ2ZXIge1xyXG4gIHJldHVybiBTZXJ2ZXIuZ2V0SW5zdGFuY2UoKTtcclxufVxyXG4vKipcclxuICogc2V0cyB0aGUgY3VycmVudCBbW1NlcnZlcl1dLlxyXG4gKlxyXG4gKiBAcGFyYW0gc2VydmVyIHRvIHNldCBzdGF0ZSBvZi5cclxuICpcclxuICogQGludGVybmFsIGZvciBsaWJyYXJ5IHVzZSBvbmx5LlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHNldEN1cnJlbnRTZXJ2ZXIoc2VydmVyOiBTZXJ2ZXIpIHtcclxuICBpZiAoc2VydmVyKSB7XHJcbiAgICBzZXJ2ZXIubWFrZUN1cnJlbnQoKTtcclxuICAgIGFzc2VydC5zdHJpY3RFcXVhbChnZXRDdXJyZW50U2VydmVyKCksIHNlcnZlcik7XHJcbiAgfSBlbHNlIHtcclxuICAgIGluaXQuaW5pdE9wdGlvbnMuc2VydmVyVXJsID0gbnVsbDtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBnZXRzIHRoZSBbW0F1dGhvcml6YXRpb25dXSBpbiBlZmZlY3QuXHJcbiAqXHJcbiAqIEByZXR1cm4ge0F1dGhvcml6YXRpb259IGluIGVmZmVjdCwgbWF5IGJlIG51bGwuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q3VycmVudEF1dGhvcml6YXRpb24oKTogYXV0aC5BdXRob3JpemF0aW9uIHtcclxuICByZXR1cm4gZ2V0Q3VycmVudFNlcnZlcigpLmF1dGhvcml6YXRpb247XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBnZXRzIHRoZSBbW09yZ2FuaXphdGlvbl1dIGluIGVmZmVjdC5cclxuICpcclxuICogQHBhcmFtIGZpZWxkcyBvZiBpbnRlcmVzdC5cclxuICogQHJldHVybiB7T3JnYW5pemF0aW9ufSBpbiBlZmZlY3QsIG1heSBiZSBudWxsLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEN1cnJlbnRPcmdhbml6YXRpb24oLi4uZmllbGRzOiBzdHJpbmdbXSk6IHJvbGVzLk9yZ2FuaXphdGlvbiB7XHJcbiAgcmV0dXJuIGdldEN1cnJlbnRTZXJ2ZXIoKS5vcmdhbml6YXRpb247XHJcbn1cclxuLyoqXHJcbiAqIHNldHMgdGhlIFtbT3JnYW5pemF0aW9uXV0uXHJcbiAqXHJcbiAqIEBwYXJhbSBvcmdhbml6YXRpb24gdG8gc2V0LlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHNldEN1cnJlbnRPcmdhbml6YXRpb24ob3JnYW5pemF0aW9uOiByb2xlcy5Pcmdhbml6YXRpb24pIHtcclxuICBnZXRDdXJyZW50U2VydmVyKCkub3JnYW5pemF0aW9uID0gb3JnYW5pemF0aW9uO1xyXG4gIGFzc2VydC5lcXVhbChnZXRDdXJyZW50T3JnYW5pemF0aW9uKCksIG9yZ2FuaXphdGlvbik7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBnZXRzIHRoZSBbW1VzZXJdXSBpbiBlZmZlY3QuXHJcbiAqXHJcbiAqIEBwYXJhbSBmaWVsZHMgb2YgaW50ZXJlc3QuXHJcbiAqIEByZXR1cm4ge1VzZXJ9IGluIGVmZmVjdCwgbWF5IGJlIG51bGwuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q3VycmVudFVzZXIoLi4uZmllbGRzOiBzdHJpbmdbXSk6IHJvbGVzLlVzZXIge1xyXG4gIHJldHVybiBnZXRDdXJyZW50U2VydmVyKCkudXNlcjtcclxufVxyXG4iXX0=