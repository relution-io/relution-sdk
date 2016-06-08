/**
 * @file web/urls.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 08.06.2016
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
var url = require('url');
var _ = require('lodash');
var init = require('../core/init');
var server = require('../security/server');
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
 * @param path path to resolve.
 * @param options of server in effect.
 * @return {string} absolute URL of path on current server.
 */
function resolveUrl(path, options) {
    if (options === void 0) { options = {}; }
    var serverUrl = options.serverUrl || init.initOptions.serverUrl;
    if (!serverUrl) {
        return path;
    }
    if (path.charAt(0) !== '/') {
        // construct full application url
        var tenantOrga = options.tenantOrga;
        if (!tenantOrga) {
            // following extracts the tenantOrga set on the specific server
            var serverObj = server.Server.getInstance(serverUrl);
            tenantOrga = serverObj.applyOptions({
                serverUrl: serverUrl
            }).tenantOrga;
            if (!tenantOrga) {
                tenantOrga = init.initOptions.tenantOrga;
                if (!tenantOrga) {
                    var organization = serverObj.organization;
                    if (organization) {
                        tenantOrga = organization.uniqueName;
                    }
                }
            }
        }
        var application = options.application || init.initOptions.application;
        serverUrl = url.resolve(serverUrl, '/' + tenantOrga + '/' + application + '/');
    }
    return url.resolve(serverUrl, path);
}
exports.resolveUrl = resolveUrl;
/**
 * computes the basepath of a BaaS application.
 *
 * @param baseAliasOrNameOrApp baseAlias of application, may be name when baseAlias is not changed
 *    by developer or application metadata object of Relution server.
 * @param options of server in effect.
 * @return {string} absolute URL of application alias on current server.
 */
function resolveApp(baseAliasOrNameOrApp, options) {
    if (options === void 0) { options = {}; }
    // defaults on arguments given
    var url;
    if (!baseAliasOrNameOrApp) {
        url = options.application || init.initOptions.application;
    }
    else if (_.isString(baseAliasOrNameOrApp)) {
        url = baseAliasOrNameOrApp;
    }
    else {
        url = baseAliasOrNameOrApp.baseAlias || baseAliasOrNameOrApp.name;
    }
    // application must not include the leading slash for resolveUrl to do the job
    url = url.replace(/\/?(.*)/, '$1');
    // resolve local path against application
    return resolveUrl('.', _.defaults({
        application: url
    }, options));
}
exports.resolveApp = resolveApp;
//# sourceMappingURL=urls.js.map