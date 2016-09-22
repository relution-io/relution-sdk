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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3NlY3VyaXR5L3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksTUFBTSxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQ2pDLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRTVCLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQ3JDLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBRXJDLElBQVksSUFBSSxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQy9CLElBQVksS0FBSyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBRWpDOzs7O0dBSUc7QUFDSDtJQTRERSxnQkFBWSxTQUFpQjtRQTdCN0IsaUJBQWlCO1FBQ1QsVUFBSyxHQWdCVDtZQUNGLGFBQWEsRUFBRSxJQUFJLENBQUMsdUJBQXVCO1lBQzNDLFlBQVksRUFBRSxJQUFJO1lBQ2xCLElBQUksRUFBRSxJQUFJO1lBQ1YsV0FBVyxFQUFFLElBQUk7U0FDbEIsQ0FBQztRQVFBLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDckMsQ0FBQztJQXREYSxrQkFBVyxHQUF6QixVQUEwQixTQUE4QztRQUE5Qyx5QkFBOEMsR0FBOUMsWUFBb0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTO1FBQ3RFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUNELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FB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QU8vQixDQUFBO0FBRUQ7Ozs7R0FJRztBQUNIO0lBQ0UsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsYUFBYSxDQUFDO0FBQzFDLENBQUM7QUFGZSwrQkFBdUIsMEJBRXRDLENBQUE7QUFFRDs7Ozs7R0FLRztBQUNIO0lBQXVDLGdCQUFtQjtTQUFuQixXQUFtQixDQUFuQixzQkFBbUIsQ0FBbkIsSUFBbUI7UUFBbkIsK0JBQW1COztJQUN4RCxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxZQUFZLENBQUM7QUFDekMsQ0FBQztBQUZlLDhCQUFzQix5QkFFckMsQ0FBQTtBQUNEOzs7O0dBSUc7QUFDSCxnQ0FBdUMsWUFBZ0M7SUFDckUsZ0JBQWdCLEVBQUUsQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO0lBQy9DLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUN2RCxDQUFDO0FBSGUsOEJBQXNCLHlCQUdyQyxDQUFBO0FBRUQ7Ozs7O0dBS0c7QUFDSDtJQUErQixnQkFBbUI7U0FBbkIsV0FBbUIsQ0FBbkIsc0JBQW1CLENBQW5CLElBQW1CO1FBQW5CLCtCQUFtQjs7SUFDaEQsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsSUFBSSxDQUFDO0FBQ2pDLENBQUM7QUFGZSxzQkFBYyxpQkFFN0IsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBzZWN1cml0eS9zZXJ2ZXIudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI4LjA0LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBzZWN1cml0eVxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCAqIGFzIGluaXQgZnJvbSAnLi4vY29yZS9pbml0JztcbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi4vY29yZS9kaWFnJztcblxuaW1wb3J0ICogYXMgYXV0aCBmcm9tICcuL2F1dGgnO1xuaW1wb3J0ICogYXMgcm9sZXMgZnJvbSAnLi9yb2xlcyc7XG5cbi8qKlxuICogcGVyLXNlcnZlciBzdGF0ZSBtYW5hZ2VtZW50LlxuICpcbiAqIEBpbnRlcm5hbCBmb3IgbGlicmFyeSB1c2Ugb25seS5cbiAqL1xuZXhwb3J0IGNsYXNzIFNlcnZlciB7XG5cbiAgLyoqXG4gICAqIHNlcnZlcnMgYnkgdXJsLlxuICAgKi9cbiAgcHJpdmF0ZSBzdGF0aWMgc2VydmVyczoge1xuICAgIFt1cmw6IHN0cmluZ106IFNlcnZlcjtcbiAgfSA9IHt9O1xuXG4gIHB1YmxpYyBzdGF0aWMgZ2V0SW5zdGFuY2Uoc2VydmVyVXJsOiBzdHJpbmcgPSBpbml0LmluaXRPcHRpb25zLnNlcnZlclVybCk6IFNlcnZlciB7XG4gICAgaWYgKCFzZXJ2ZXJVcmwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbm8gc2VydmVyIHNldCcpO1xuICAgIH1cbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBzZXJ2ZXJVcmxbc2VydmVyVXJsLmxlbmd0aCAtIDFdID09PSAnLycsIHNlcnZlclVybCk7XG4gICAgbGV0IHNlcnZlciA9IFNlcnZlci5zZXJ2ZXJzW3NlcnZlclVybF07XG4gICAgaWYgKCFzZXJ2ZXIpIHtcbiAgICAgIHNlcnZlciA9IG5ldyBTZXJ2ZXIoc2VydmVyVXJsKTtcbiAgICAgIFNlcnZlci5zZXJ2ZXJzW3NlcnZlclVybF0gPSBzZXJ2ZXI7XG4gICAgfVxuICAgIHJldHVybiBzZXJ2ZXI7XG4gIH1cblxuICBwdWJsaWMgbWFrZUN1cnJlbnQoKSB7XG4gICAgaW5pdC5pbml0T3B0aW9ucy5zZXJ2ZXJVcmwgPSB0aGlzLm9wdGlvbnMuc2VydmVyVXJsO1xuICB9XG5cbiAgLyoqXG4gICAqIGN1cnJlbnQgc2V0IG9mIG9wdGlvbnMgaW4gZWZmZWN0IGZvciB0aGlzIHNlcnZlci5cbiAgICovXG4gIHByaXZhdGUgb3B0aW9uczogaW5pdC5TZXJ2ZXJJbml0T3B0aW9ucztcblxuICAvLyBzZWN1cml0eSBzdGF0ZVxuICBwcml2YXRlIHN0YXRlOiB7XG4gICAgYXV0aG9yaXphdGlvbjogYXV0aC5BdXRob3JpemF0aW9uLFxuICAgIC8qKlxuICAgICAqIHN0b3JhZ2Ugb2YgW1tPcmdhbml6YXRpb25dXSBpbiBlZmZlY3QuXG4gICAgICpcbiAgICAgKiBVc2VzIG51bGwgaW5zdGVhZCBvZiB7fSBmb3IgZW1wdHkgdmFsdWUgc28geW91IGNhbiB0ZXN0IHVzaW5nIGlmIHN0YXRlbWVudCB2aWEgY29oZXJzaW9uIHRvXG4gICAgICogYm9vbGVhbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtPcmdhbml6YXRpb259IGluIGVmZmVjdCwgbWF5IGJlIG51bGwuXG4gICAgICovXG4gICAgb3JnYW5pemF0aW9uOiByb2xlcy5Pcmdhbml6YXRpb24sXG4gICAgdXNlcjogcm9sZXMuVXNlcixcbiAgICAvKipcbiAgICAgKiBjb3B5IG9mIGNyZWRlbnRpYWxzIHJlcXVpcmVkIGZvciByZWVzdGFibGlzaGluZyB0aGUgc2Vzc2lvbiB3aGVuIGl0IHRpbWVkIG91dCwgZm9yIGV4YW1wbGUuXG4gICAgICovXG4gICAgY3JlZGVudGlhbHM6IGF1dGguQ3JlZGVudGlhbHNcbiAgfSA9IHtcbiAgICBhdXRob3JpemF0aW9uOiBhdXRoLkFOT05ZTU9VU19BVVRIT1JJWkFUSU9OLFxuICAgIG9yZ2FuaXphdGlvbjogbnVsbCxcbiAgICB1c2VyOiBudWxsLFxuICAgIGNyZWRlbnRpYWxzOiBudWxsXG4gIH07XG5cbiAgLyoqXG4gICAqIGxhc3Qgc2VlbiBYLUdvZmVyLVVzZXIgaGVhZGVyIHZhbHVlIGluZGljYXRpbmcgYSBzZXJ2ZXIgc2Vzc2lvbi5cbiAgICovXG4gIHB1YmxpYyBzZXNzaW9uVXNlclV1aWQ6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihzZXJ2ZXJVcmw6IHN0cmluZykge1xuICAgIHRoaXMub3B0aW9ucyA9IGluaXQuY2xvbmVTZXJ2ZXJJbml0T3B0aW9ucyhpbml0LmluaXRPcHRpb25zKTtcbiAgICB0aGlzLm9wdGlvbnMuc2VydmVyVXJsID0gc2VydmVyVXJsO1xuICB9XG5cbiAgLyoqXG4gICAqIHVzZWQgdG8gdXBkYXRlIG9wdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRzIHRvIGFwcGx5LlxuICAgKiBAcmV0dXJuIHsqfSB1cGRhdGVkIG9wdGlvbnMuXG4gICAqL1xuICBwdWJsaWMgYXBwbHlPcHRpb25zKHNlcnZlckluaXRPcHRpb25zOiBpbml0LlNlcnZlckluaXRPcHRpb25zKTogaW5pdC5TZXJ2ZXJJbml0T3B0aW9ucyB7XG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gdGhpcy5vcHRpb25zLnNlcnZlclVybCA9PT0gc2VydmVySW5pdE9wdGlvbnMuc2VydmVyVXJsKTtcbiAgICByZXR1cm4gXy5hc3NpZ25XaXRoKHRoaXMub3B0aW9ucywgc2VydmVySW5pdE9wdGlvbnMsIChsZWZ0OiBhbnksIHJpZ2h0OiBhbnkpID0+IF8uaXNVbmRlZmluZWQocmlnaHQpID8gbGVmdCA6IHJpZ2h0KTtcbiAgfVxuXG4gIGdldCBhdXRob3JpemF0aW9uKCk6IGF1dGguQXV0aG9yaXphdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGUuYXV0aG9yaXphdGlvbjtcbiAgfVxuICBzZXQgYXV0aG9yaXphdGlvbihhdXRob3JpemF0aW9uOiBhdXRoLkF1dGhvcml6YXRpb24pIHtcbiAgICBpZiAoYXV0aG9yaXphdGlvbiAmJiBhdXRob3JpemF0aW9uICE9IGF1dGguQU5PTllNT1VTX0FVVEhPUklaQVRJT04pIHtcbiAgICAgIHRoaXMuc3RhdGUuYXV0aG9yaXphdGlvbiA9IGF1dGguZnJlZXplQXV0aG9yaXphdGlvbihhdXRob3JpemF0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdGF0ZS5hdXRob3JpemF0aW9uID0gYXV0aC5BTk9OWU1PVVNfQVVUSE9SSVpBVElPTjtcbiAgICB9XG4gIH1cblxuICBnZXQgb3JnYW5pemF0aW9uKCk6IHJvbGVzLk9yZ2FuaXphdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGUub3JnYW5pemF0aW9uO1xuICB9XG4gIHNldCBvcmdhbml6YXRpb24ob3JnYW5pemF0aW9uOiByb2xlcy5Pcmdhbml6YXRpb24pIHtcbiAgICBpZiAob3JnYW5pemF0aW9uKSB7XG4gICAgICB0aGlzLnN0YXRlLm9yZ2FuaXphdGlvbiA9IHJvbGVzLmZyZWV6ZU9yZ2FuaXphdGlvbihvcmdhbml6YXRpb24pO1xuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMudGVuYW50T3JnYSkge1xuICAgICAgICB0aGlzLm9wdGlvbnMudGVuYW50T3JnYSA9IG9yZ2FuaXphdGlvbi51bmlxdWVOYW1lO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0YXRlLm9yZ2FuaXphdGlvbiA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgZ2V0IHVzZXIoKTogcm9sZXMuVXNlciB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGUudXNlcjtcbiAgfVxuICBzZXQgdXNlcih1c2VyOiByb2xlcy5Vc2VyKSB7XG4gICAgaWYgKHVzZXIpIHtcbiAgICAgIHRoaXMuc3RhdGUudXNlciA9IHJvbGVzLmZyZWV6ZVVzZXIodXNlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3RhdGUudXNlciA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgZ2V0IGNyZWRlbnRpYWxzKCk6IGF1dGguQ3JlZGVudGlhbHMge1xuICAgIHJldHVybiB0aGlzLnN0YXRlLmNyZWRlbnRpYWxzO1xuICB9XG4gIHNldCBjcmVkZW50aWFscyhjcmVkZW50aWFsczogYXV0aC5DcmVkZW50aWFscykge1xuICAgIGlmIChjcmVkZW50aWFscykge1xuICAgICAgdGhpcy5zdGF0ZS5jcmVkZW50aWFscyA9IGF1dGguZnJlZXplQ3JlZGVudGlhbHMoYXV0aC5jbG9uZUNyZWRlbnRpYWxzKGNyZWRlbnRpYWxzKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3RhdGUuY3JlZGVudGlhbHMgPSBudWxsO1xuICAgIH1cbiAgfVxuXG59XG5cbi8qKlxuICogZ2V0cyB0aGUgY3VycmVudCBbW1NlcnZlcl1dLlxuICpcbiAqIEBwYXJhbSBzZXJ2ZXJVcmwgdG8gZ2V0IHN0YXRlIG9mLlxuICogQHJldHVybiB7U2VydmVyfSBzdGF0ZSBwYXJhbWV0ZXIuXG4gKlxuICogQGludGVybmFsIGZvciBsaWJyYXJ5IHVzZSBvbmx5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q3VycmVudFNlcnZlcigpOiBTZXJ2ZXIge1xuICByZXR1cm4gU2VydmVyLmdldEluc3RhbmNlKCk7XG59XG4vKipcbiAqIHNldHMgdGhlIGN1cnJlbnQgW1tTZXJ2ZXJdXS5cbiAqXG4gKiBAcGFyYW0gc2VydmVyIHRvIHNldCBzdGF0ZSBvZi5cbiAqXG4gKiBAaW50ZXJuYWwgZm9yIGxpYnJhcnkgdXNlIG9ubHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRDdXJyZW50U2VydmVyKHNlcnZlcjogU2VydmVyKSB7XG4gIGlmIChzZXJ2ZXIpIHtcbiAgICBzZXJ2ZXIubWFrZUN1cnJlbnQoKTtcbiAgICBhc3NlcnQuc3RyaWN0RXF1YWwoZ2V0Q3VycmVudFNlcnZlcigpLCBzZXJ2ZXIpO1xuICB9IGVsc2Uge1xuICAgIGluaXQuaW5pdE9wdGlvbnMuc2VydmVyVXJsID0gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIGdldHMgdGhlIFtbQXV0aG9yaXphdGlvbl1dIGluIGVmZmVjdC5cbiAqXG4gKiBAcmV0dXJuIHtBdXRob3JpemF0aW9ufSBpbiBlZmZlY3QsIG1heSBiZSBudWxsLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q3VycmVudEF1dGhvcml6YXRpb24oKTogYXV0aC5BdXRob3JpemF0aW9uIHtcbiAgcmV0dXJuIGdldEN1cnJlbnRTZXJ2ZXIoKS5hdXRob3JpemF0aW9uO1xufVxuXG4vKipcbiAqIGdldHMgdGhlIFtbT3JnYW5pemF0aW9uXV0gaW4gZWZmZWN0LlxuICpcbiAqIEBwYXJhbSBmaWVsZHMgb2YgaW50ZXJlc3QuXG4gKiBAcmV0dXJuIHtPcmdhbml6YXRpb259IGluIGVmZmVjdCwgbWF5IGJlIG51bGwuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDdXJyZW50T3JnYW5pemF0aW9uKC4uLmZpZWxkczogc3RyaW5nW10pOiByb2xlcy5Pcmdhbml6YXRpb24ge1xuICByZXR1cm4gZ2V0Q3VycmVudFNlcnZlcigpLm9yZ2FuaXphdGlvbjtcbn1cbi8qKlxuICogc2V0cyB0aGUgW1tPcmdhbml6YXRpb25dXS5cbiAqXG4gKiBAcGFyYW0gb3JnYW5pemF0aW9uIHRvIHNldC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldEN1cnJlbnRPcmdhbml6YXRpb24ob3JnYW5pemF0aW9uOiByb2xlcy5Pcmdhbml6YXRpb24pIHtcbiAgZ2V0Q3VycmVudFNlcnZlcigpLm9yZ2FuaXphdGlvbiA9IG9yZ2FuaXphdGlvbjtcbiAgYXNzZXJ0LmVxdWFsKGdldEN1cnJlbnRPcmdhbml6YXRpb24oKSwgb3JnYW5pemF0aW9uKTtcbn1cblxuLyoqXG4gKiBnZXRzIHRoZSBbW1VzZXJdXSBpbiBlZmZlY3QuXG4gKlxuICogQHBhcmFtIGZpZWxkcyBvZiBpbnRlcmVzdC5cbiAqIEByZXR1cm4ge1VzZXJ9IGluIGVmZmVjdCwgbWF5IGJlIG51bGwuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDdXJyZW50VXNlciguLi5maWVsZHM6IHN0cmluZ1tdKTogcm9sZXMuVXNlciB7XG4gIHJldHVybiBnZXRDdXJyZW50U2VydmVyKCkudXNlcjtcbn1cbiJdfQ==