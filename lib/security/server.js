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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3NlY3VyaXR5L3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksTUFBTSxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQ2pDLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRTVCLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQ3JDLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBRXJDLElBQVksSUFBSSxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQy9CLElBQVksS0FBSyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBRWpDLElBQVksTUFBTSxXQUFNLGVBQWUsQ0FBQyxDQUFBO0FBRXhDOzs7O0dBSUc7QUFDSDtJQThERSxnQkFBWSxTQUFpQjtRQS9CN0IsaUJBQWlCO1FBQ1QsVUFBSyxHQWlCVDtZQUNGLGFBQWEsRUFBRSxJQUFJLENBQUMsdUJBQXVCO1lBQzNDLFlBQVksRUFBRSxJQUFJO1lBQ2xCLElBQUksRUFBRSxJQUFJO1lBQ1YsV0FBVyxFQUFFLElBQUk7WUFDakIsV0FBVyxFQUFFLElBQUk7U0FDbEIsQ0FBQztRQVFBLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDckMsQ0FBQztJQXhEYSxrQkFBVyxHQUF6QixVQUEwQixTQUE4QztRQUE5Qyx5QkFBOEMsR0FBOUMsWUFBb0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTO1FBQ3RFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENB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QUFDLGdCQUFnQixFQUFFLENBQUMsSUFBSSxDQUFDO0FBQ2pDLENBQUM7QUFGZSxzQkFBYyxpQkFFN0IsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBzZWN1cml0eS9zZXJ2ZXIudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI4LjA0LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBzZWN1cml0eVxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCAqIGFzIGluaXQgZnJvbSAnLi4vY29yZS9pbml0JztcbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi4vY29yZS9kaWFnJztcblxuaW1wb3J0ICogYXMgYXV0aCBmcm9tICcuL2F1dGgnO1xuaW1wb3J0ICogYXMgcm9sZXMgZnJvbSAnLi9yb2xlcyc7XG5cbmltcG9ydCAqIGFzIG9ubGluZSBmcm9tICcuLi93ZWIvb25saW5lJztcblxuLyoqXG4gKiBwZXItc2VydmVyIHN0YXRlIG1hbmFnZW1lbnQuXG4gKlxuICogQGludGVybmFsIGZvciBsaWJyYXJ5IHVzZSBvbmx5LlxuICovXG5leHBvcnQgY2xhc3MgU2VydmVyIHtcblxuICAvKipcbiAgICogc2VydmVycyBieSB1cmwuXG4gICAqL1xuICBwcml2YXRlIHN0YXRpYyBzZXJ2ZXJzOiB7XG4gICAgW3VybDogc3RyaW5nXTogU2VydmVyO1xuICB9ID0ge307XG5cbiAgcHVibGljIHN0YXRpYyBnZXRJbnN0YW5jZShzZXJ2ZXJVcmw6IHN0cmluZyA9IGluaXQuaW5pdE9wdGlvbnMuc2VydmVyVXJsKTogU2VydmVyIHtcbiAgICBpZiAoIXNlcnZlclVybCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyBzZXJ2ZXIgc2V0Jyk7XG4gICAgfVxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHNlcnZlclVybFtzZXJ2ZXJVcmwubGVuZ3RoIC0gMV0gPT09ICcvJywgc2VydmVyVXJsKTtcbiAgICBsZXQgc2VydmVyID0gU2VydmVyLnNlcnZlcnNbc2VydmVyVXJsXTtcbiAgICBpZiAoIXNlcnZlcikge1xuICAgICAgc2VydmVyID0gbmV3IFNlcnZlcihzZXJ2ZXJVcmwpO1xuICAgICAgU2VydmVyLnNlcnZlcnNbc2VydmVyVXJsXSA9IHNlcnZlcjtcbiAgICB9XG4gICAgcmV0dXJuIHNlcnZlcjtcbiAgfVxuXG4gIHB1YmxpYyBtYWtlQ3VycmVudCgpIHtcbiAgICBpbml0LmluaXRPcHRpb25zLnNlcnZlclVybCA9IHRoaXMub3B0aW9ucy5zZXJ2ZXJVcmw7XG4gIH1cblxuICAvKipcbiAgICogY3VycmVudCBzZXQgb2Ygb3B0aW9ucyBpbiBlZmZlY3QgZm9yIHRoaXMgc2VydmVyLlxuICAgKi9cbiAgcHJpdmF0ZSBvcHRpb25zOiBpbml0LlNlcnZlckluaXRPcHRpb25zO1xuXG4gIC8vIHNlY3VyaXR5IHN0YXRlXG4gIHByaXZhdGUgc3RhdGU6IHtcbiAgICBhdXRob3JpemF0aW9uOiBhdXRoLkF1dGhvcml6YXRpb24sXG4gICAgLyoqXG4gICAgICogc3RvcmFnZSBvZiBbW09yZ2FuaXphdGlvbl1dIGluIGVmZmVjdC5cbiAgICAgKlxuICAgICAqIFVzZXMgbnVsbCBpbnN0ZWFkIG9mIHt9IGZvciBlbXB0eSB2YWx1ZSBzbyB5b3UgY2FuIHRlc3QgdXNpbmcgaWYgc3RhdGVtZW50IHZpYSBjb2hlcnNpb24gdG9cbiAgICAgKiBib29sZWFuLlxuICAgICAqXG4gICAgICogQHR5cGUge09yZ2FuaXphdGlvbn0gaW4gZWZmZWN0LCBtYXkgYmUgbnVsbC5cbiAgICAgKi9cbiAgICBvcmdhbml6YXRpb246IHJvbGVzLk9yZ2FuaXphdGlvbixcbiAgICB1c2VyOiByb2xlcy5Vc2VyLFxuICAgIC8qKlxuICAgICAqIGNvcHkgb2YgY3JlZGVudGlhbHMgcmVxdWlyZWQgZm9yIHJlZXN0YWJsaXNoaW5nIHRoZSBzZXNzaW9uIHdoZW4gaXQgdGltZWQgb3V0LCBmb3IgZXhhbXBsZS5cbiAgICAgKi9cbiAgICBjcmVkZW50aWFsczogYXV0aC5DcmVkZW50aWFscyxcbiAgICBzZXJ2ZXJJbmZvczogb25saW5lLlNlcnZlckluZm9ybWF0aW9uXG4gIH0gPSB7XG4gICAgYXV0aG9yaXphdGlvbjogYXV0aC5BTk9OWU1PVVNfQVVUSE9SSVpBVElPTixcbiAgICBvcmdhbml6YXRpb246IG51bGwsXG4gICAgdXNlcjogbnVsbCxcbiAgICBjcmVkZW50aWFsczogbnVsbCxcbiAgICBzZXJ2ZXJJbmZvczogbnVsbFxuICB9O1xuXG4gIC8qKlxuICAgKiBsYXN0IHNlZW4gWC1Hb2Zlci1Vc2VyIGhlYWRlciB2YWx1ZSBpbmRpY2F0aW5nIGEgc2VydmVyIHNlc3Npb24uXG4gICAqL1xuICBwdWJsaWMgc2Vzc2lvblVzZXJVdWlkOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3Ioc2VydmVyVXJsOiBzdHJpbmcpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBpbml0LmNsb25lU2VydmVySW5pdE9wdGlvbnMoaW5pdC5pbml0T3B0aW9ucyk7XG4gICAgdGhpcy5vcHRpb25zLnNlcnZlclVybCA9IHNlcnZlclVybDtcbiAgfVxuXG4gIC8qKlxuICAgKiB1c2VkIHRvIHVwZGF0ZSBvcHRpb25zLlxuICAgKlxuICAgKiBAcGFyYW0gb3B0cyB0byBhcHBseS5cbiAgICogQHJldHVybiB7Kn0gdXBkYXRlZCBvcHRpb25zLlxuICAgKi9cbiAgcHVibGljIGFwcGx5T3B0aW9ucyhzZXJ2ZXJJbml0T3B0aW9uczogaW5pdC5TZXJ2ZXJJbml0T3B0aW9ucyk6IGluaXQuU2VydmVySW5pdE9wdGlvbnMge1xuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHRoaXMub3B0aW9ucy5zZXJ2ZXJVcmwgPT09IHNlcnZlckluaXRPcHRpb25zLnNlcnZlclVybCk7XG4gICAgcmV0dXJuIF8uYXNzaWduV2l0aCh0aGlzLm9wdGlvbnMsIHNlcnZlckluaXRPcHRpb25zLCAobGVmdDogYW55LCByaWdodDogYW55KSA9PiBfLmlzVW5kZWZpbmVkKHJpZ2h0KSA/IGxlZnQgOiByaWdodCk7XG4gIH1cblxuICBnZXQgYXV0aG9yaXphdGlvbigpOiBhdXRoLkF1dGhvcml6YXRpb24ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlLmF1dGhvcml6YXRpb247XG4gIH1cbiAgc2V0IGF1dGhvcml6YXRpb24oYXV0aG9yaXphdGlvbjogYXV0aC5BdXRob3JpemF0aW9uKSB7XG4gICAgaWYgKGF1dGhvcml6YXRpb24gJiYgYXV0aG9yaXphdGlvbiAhPSBhdXRoLkFOT05ZTU9VU19BVVRIT1JJWkFUSU9OKSB7XG4gICAgICB0aGlzLnN0YXRlLmF1dGhvcml6YXRpb24gPSBhdXRoLmZyZWV6ZUF1dGhvcml6YXRpb24oYXV0aG9yaXphdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3RhdGUuYXV0aG9yaXphdGlvbiA9IGF1dGguQU5PTllNT1VTX0FVVEhPUklaQVRJT047XG4gICAgfVxuICB9XG5cbiAgZ2V0IG9yZ2FuaXphdGlvbigpOiByb2xlcy5Pcmdhbml6YXRpb24ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlLm9yZ2FuaXphdGlvbjtcbiAgfVxuICBzZXQgb3JnYW5pemF0aW9uKG9yZ2FuaXphdGlvbjogcm9sZXMuT3JnYW5pemF0aW9uKSB7XG4gICAgaWYgKG9yZ2FuaXphdGlvbikge1xuICAgICAgdGhpcy5zdGF0ZS5vcmdhbml6YXRpb24gPSByb2xlcy5mcmVlemVPcmdhbml6YXRpb24ob3JnYW5pemF0aW9uKTtcbiAgICAgIGlmICghdGhpcy5vcHRpb25zLnRlbmFudE9yZ2EpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLnRlbmFudE9yZ2EgPSBvcmdhbml6YXRpb24udW5pcXVlTmFtZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdGF0ZS5vcmdhbml6YXRpb24gPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGdldCB1c2VyKCk6IHJvbGVzLlVzZXIge1xuICAgIHJldHVybiB0aGlzLnN0YXRlLnVzZXI7XG4gIH1cbiAgc2V0IHVzZXIodXNlcjogcm9sZXMuVXNlcikge1xuICAgIGlmICh1c2VyKSB7XG4gICAgICB0aGlzLnN0YXRlLnVzZXIgPSByb2xlcy5mcmVlemVVc2VyKHVzZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0YXRlLnVzZXIgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGdldCBjcmVkZW50aWFscygpOiBhdXRoLkNyZWRlbnRpYWxzIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZS5jcmVkZW50aWFscztcbiAgfVxuICBzZXQgY3JlZGVudGlhbHMoY3JlZGVudGlhbHM6IGF1dGguQ3JlZGVudGlhbHMpIHtcbiAgICBpZiAoY3JlZGVudGlhbHMpIHtcbiAgICAgIHRoaXMuc3RhdGUuY3JlZGVudGlhbHMgPSBhdXRoLmZyZWV6ZUNyZWRlbnRpYWxzKGF1dGguY2xvbmVDcmVkZW50aWFscyhjcmVkZW50aWFscykpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0YXRlLmNyZWRlbnRpYWxzID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICBnZXQgc2VydmVySW5mb3MoKTogb25saW5lLlNlcnZlckluZm9ybWF0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZS5zZXJ2ZXJJbmZvcztcbiAgfVxuICBzZXQgc2VydmVySW5mb3Moc2VydmVySW5mb3M6IG9ubGluZS5TZXJ2ZXJJbmZvcm1hdGlvbikge1xuICAgIGlmIChzZXJ2ZXJJbmZvcykge1xuICAgICAgdGhpcy5zdGF0ZS5zZXJ2ZXJJbmZvcyA9IG9ubGluZS5mcmVlemVTZXJ2ZXJJbmZvcm1hdGlvbihzZXJ2ZXJJbmZvcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3RhdGUuc2VydmVySW5mb3MgPSBudWxsO1xuICAgIH1cbiAgfVxuXG59XG5cbi8qKlxuICogZ2V0cyB0aGUgY3VycmVudCBbW1NlcnZlcl1dLlxuICpcbiAqIEBwYXJhbSBzZXJ2ZXJVcmwgdG8gZ2V0IHN0YXRlIG9mLlxuICogQHJldHVybiB7U2VydmVyfSBzdGF0ZSBwYXJhbWV0ZXIuXG4gKlxuICogQGludGVybmFsIGZvciBsaWJyYXJ5IHVzZSBvbmx5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q3VycmVudFNlcnZlcigpOiBTZXJ2ZXIge1xuICByZXR1cm4gU2VydmVyLmdldEluc3RhbmNlKCk7XG59XG4vKipcbiAqIHNldHMgdGhlIGN1cnJlbnQgW1tTZXJ2ZXJdXS5cbiAqXG4gKiBAcGFyYW0gc2VydmVyIHRvIHNldCBzdGF0ZSBvZi5cbiAqXG4gKiBAaW50ZXJuYWwgZm9yIGxpYnJhcnkgdXNlIG9ubHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRDdXJyZW50U2VydmVyKHNlcnZlcjogU2VydmVyKSB7XG4gIGlmIChzZXJ2ZXIpIHtcbiAgICBzZXJ2ZXIubWFrZUN1cnJlbnQoKTtcbiAgICBhc3NlcnQuc3RyaWN0RXF1YWwoZ2V0Q3VycmVudFNlcnZlcigpLCBzZXJ2ZXIpO1xuICB9IGVsc2Uge1xuICAgIGluaXQuaW5pdE9wdGlvbnMuc2VydmVyVXJsID0gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIGdldHMgdGhlIFtbQXV0aG9yaXphdGlvbl1dIGluIGVmZmVjdC5cbiAqXG4gKiBAcmV0dXJuIHtBdXRob3JpemF0aW9ufSBpbiBlZmZlY3QsIG1heSBiZSBudWxsLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q3VycmVudEF1dGhvcml6YXRpb24oKTogYXV0aC5BdXRob3JpemF0aW9uIHtcbiAgcmV0dXJuIGdldEN1cnJlbnRTZXJ2ZXIoKS5hdXRob3JpemF0aW9uO1xufVxuXG4vKipcbiAqIGdldHMgdGhlIFtbT3JnYW5pemF0aW9uXV0gaW4gZWZmZWN0LlxuICpcbiAqIEBwYXJhbSBmaWVsZHMgb2YgaW50ZXJlc3QuXG4gKiBAcmV0dXJuIHtPcmdhbml6YXRpb259IGluIGVmZmVjdCwgbWF5IGJlIG51bGwuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDdXJyZW50T3JnYW5pemF0aW9uKC4uLmZpZWxkczogc3RyaW5nW10pOiByb2xlcy5Pcmdhbml6YXRpb24ge1xuICByZXR1cm4gZ2V0Q3VycmVudFNlcnZlcigpLm9yZ2FuaXphdGlvbjtcbn1cbi8qKlxuICogc2V0cyB0aGUgW1tPcmdhbml6YXRpb25dXS5cbiAqXG4gKiBAcGFyYW0gb3JnYW5pemF0aW9uIHRvIHNldC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldEN1cnJlbnRPcmdhbml6YXRpb24ob3JnYW5pemF0aW9uOiByb2xlcy5Pcmdhbml6YXRpb24pIHtcbiAgZ2V0Q3VycmVudFNlcnZlcigpLm9yZ2FuaXphdGlvbiA9IG9yZ2FuaXphdGlvbjtcbiAgYXNzZXJ0LmVxdWFsKGdldEN1cnJlbnRPcmdhbml6YXRpb24oKSwgb3JnYW5pemF0aW9uKTtcbn1cblxuLyoqXG4gKiBnZXRzIHRoZSBbW1VzZXJdXSBpbiBlZmZlY3QuXG4gKlxuICogQHBhcmFtIGZpZWxkcyBvZiBpbnRlcmVzdC5cbiAqIEByZXR1cm4ge1VzZXJ9IGluIGVmZmVjdCwgbWF5IGJlIG51bGwuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDdXJyZW50VXNlciguLi5maWVsZHM6IHN0cmluZ1tdKTogcm9sZXMuVXNlciB7XG4gIHJldHVybiBnZXRDdXJyZW50U2VydmVyKCkudXNlcjtcbn1cbiJdfQ==