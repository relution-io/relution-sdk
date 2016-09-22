/*
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
/**
 * @module web
 */
/** */
"use strict";
var url = require('url');
var _ = require('lodash');
var init = require('../core/init');
var server = require('../security/server');
/**
 * computes a server url from a given path.
 *
 * @param path path to resolve, relative or absolute.
 * @param options of server in effect.
 * @return {string} absolute URL of server.
 */
function resolveServer(path, options) {
    if (options === void 0) { options = {}; }
    var serverUrl = options.serverUrl || init.initOptions.serverUrl;
    if (path) {
        if (serverUrl) {
            path = url.resolve(serverUrl, path);
        }
    }
    else {
        path = serverUrl;
    }
    return url.resolve(path, '/');
}
exports.resolveServer = resolveServer;
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
    var serverUrl = resolveServer(path, options);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy93ZWIvdXJscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksR0FBRyxXQUFNLEtBQUssQ0FBQyxDQUFBO0FBQzNCLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRTVCLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQ3JDLElBQVksTUFBTSxXQUFNLG9CQUFvQixDQUFDLENBQUE7QUFFN0M7Ozs7OztHQU1HO0FBQ0gsdUJBQThCLElBQVksRUFBRSxPQUFtQztJQUFuQyx1QkFBbUMsR0FBbkMsWUFBbUM7SUFDN0UsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQztJQUNoRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ1QsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNkLElBQUksR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN0QyxDQUFDO0lBQ0gsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sSUFBSSxHQUFHLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ2hDLENBQUM7QUFWZSxxQkFBYSxnQkFVNUIsQ0FBQTtBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSCxvQkFBMkIsSUFBWSxFQUFFLE9BQW1DO0lBQW5DLHVCQUFtQyxHQUFuQyxZQUFtQztJQUMxRSxJQUFJLFNBQVMsR0FBRyxhQUFhLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzdDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNmLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzNCLGlDQUFpQztRQUNqQyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO1FBQ3BDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNoQiwrREFBK0Q7WUFDL0QsSUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdkQsVUFBVSxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUM7Z0JBQ2xDLFNBQVMsRUFBRSxTQUFTO2FBQ3JCLENBQUMsQ0FBQyxVQUFVLENBQUM7WUFDZCxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hCLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQztnQkFDekMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO29CQUNoQixJQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDO29CQUM1QyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO3dCQUNqQixVQUFVLEdBQUcsWUFBWSxDQUFDLFVBQVUsQ0FBQztvQkFDdkMsQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFDRCxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDO1FBQ3RFLFNBQVMsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLEdBQUcsVUFBVSxHQUFHLEdBQUcsR0FBRyxXQUFXLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDakYsQ0FBQztJQUVELE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBOUJlLGtCQUFVLGFBOEJ6QixDQUFBO0FBRUQ7Ozs7Ozs7R0FPRztBQUNILG9CQUEyQixvQkFBeUIsRUFBRSxPQUFtQztJQUFuQyx1QkFBbUMsR0FBbkMsWUFBbUM7SUFDdkYsOEJBQThCO0lBQzlCLElBQUksR0FBVyxDQUFDO0lBQ2hCLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBQzFCLEdBQUcsR0FBRyxPQUFPLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDO0lBQzVELENBQUM7SUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1QyxHQUFHLEdBQUcsb0JBQW9CLENBQUM7SUFDN0IsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sR0FBRyxHQUFHLG9CQUFvQixDQUFDLFNBQVMsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUM7SUFDcEUsQ0FBQztJQUVELDhFQUE4RTtJQUM5RSxHQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFbkMseUNBQXlDO0lBQ3pDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDaEMsV0FBVyxFQUFFLEdBQUc7S0FDakIsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ2YsQ0FBQztBQWxCZSxrQkFBVSxhQWtCekIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSB3ZWIvdXJscy50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMDguMDYuMjAxNlxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIHdlYlxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCAqIGFzIGluaXQgZnJvbSAnLi4vY29yZS9pbml0JztcbmltcG9ydCAqIGFzIHNlcnZlciBmcm9tICcuLi9zZWN1cml0eS9zZXJ2ZXInO1xuXG4vKipcbiAqIGNvbXB1dGVzIGEgc2VydmVyIHVybCBmcm9tIGEgZ2l2ZW4gcGF0aC5cbiAqXG4gKiBAcGFyYW0gcGF0aCBwYXRoIHRvIHJlc29sdmUsIHJlbGF0aXZlIG9yIGFic29sdXRlLlxuICogQHBhcmFtIG9wdGlvbnMgb2Ygc2VydmVyIGluIGVmZmVjdC5cbiAqIEByZXR1cm4ge3N0cmluZ30gYWJzb2x1dGUgVVJMIG9mIHNlcnZlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVTZXJ2ZXIocGF0aDogc3RyaW5nLCBvcHRpb25zOiBpbml0LlNlcnZlclVybE9wdGlvbnMgPSB7fSk6IHN0cmluZyB7XG4gIGxldCBzZXJ2ZXJVcmwgPSBvcHRpb25zLnNlcnZlclVybCB8fCBpbml0LmluaXRPcHRpb25zLnNlcnZlclVybDtcbiAgaWYgKHBhdGgpIHtcbiAgICBpZiAoc2VydmVyVXJsKSB7XG4gICAgICBwYXRoID0gdXJsLnJlc29sdmUoc2VydmVyVXJsLCBwYXRoKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcGF0aCA9IHNlcnZlclVybDtcbiAgfVxuICByZXR1cm4gdXJsLnJlc29sdmUocGF0aCwgJy8nKTtcbn1cblxuLyoqXG4gKiBjb21wdXRlcyBhIHVybCBmcm9tIGEgZ2l2ZW4gcGF0aC5cbiAqXG4gKiAtIGFic29sdXRlIFVSTHMgYXJlIHVzZWQgYXMgaXMsIGUuZy5cbiAqICAgYGBodHRwOi8vMTkyLjE2OC4wLjEwOjgwODAvbXdheS9teWFwcC9hcGkvdjEvc29tZV9lbmRwb2ludGBgIHN0YXlzIGFzIGlzLFxuICogLSBtYWNoaW5lLXJlbGF0aXZlIFVSTHMgYmVnaW5uaW5nIHdpdGggYGAvYGAgYXJlIHJlc29sdmVkIGFnYWluc3QgdGhlIFJlbHV0aW9uIHNlcnZlciBsb2dnZWRcbiAqICAgaW50bywgc28gdGhhdCBgYC9nb2Zlci8uLi4vcmVzdC8uLi5gYC1zdHlsZSBVUkxzIHdvcmsgYXMgZXhwZWN0ZWQsIGZvciBleGFtcGxlXG4gKiAgIGBgL213YXkvbXlhcHAvYXBpL3YxL3NvbWVfZW5kcG9pbnRgYCByZXNvbHZlcyBhcyBhYm92ZSB3aGVuIGxvZ2dlZCBpbnRvXG4gKiAgIGBgaHR0cDovLzE5Mi4xNjguMC4xMDo4MDgwYGAsXG4gKiAtIGNvbnRleHQtcmVsYXRpdmUgVVJMcyBzdWNoIGFzIGBgYXBpL3YxLy4uLmBgIGFyZSByZXNvbHZlZCB1c2luZyB0aGUgUmVsdXRpb24gc2VydmVyIGxvZ2dlZCBpbixcbiAqICAgdGhlIGBgdW5pcXVlTmFtZWBgIG9mIHRoZSBgYGN1cnJlbnRPcmdhbml6YXRpb25gYCBhbmQgdGhlIGFwcGxpY2F0aW9uIG5hbWUsIGZvciBleGFtcGxlXG4gKiAgIGBgYXBpL3YxL3NvbWVfZW5kcG9pbnRgYCByZXNvbHZlcyBhcyBhYm92ZSB3aGVuIGFwcGxpY2F0aW9uIG15YXBwIGxvZ2dlZCBpbnRvXG4gKiAgIGBgaHR0cDovLzE5Mi4xNjguMC4xMDo4MDgwYGAgdXNpbmcgYSB1c2VyIG9mIG9yZ2FuaXphdGlvbiBtd2F5IHByb3ZpZGVkIGN1cnJlbnRPcmdhbml6YXRpb25cbiAqICAgd2FzIG5vdCBjaGFuZ2VkIGV4cGxpY2l0bHkgdG8gc29tZXRoaW5nIGVsc2UuXG4gKlxuICogQHBhcmFtIHBhdGggcGF0aCB0byByZXNvbHZlLlxuICogQHBhcmFtIG9wdGlvbnMgb2Ygc2VydmVyIGluIGVmZmVjdC5cbiAqIEByZXR1cm4ge3N0cmluZ30gYWJzb2x1dGUgVVJMIG9mIHBhdGggb24gY3VycmVudCBzZXJ2ZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlVXJsKHBhdGg6IHN0cmluZywgb3B0aW9uczogaW5pdC5TZXJ2ZXJVcmxPcHRpb25zID0ge30pOiBzdHJpbmcge1xuICBsZXQgc2VydmVyVXJsID0gcmVzb2x2ZVNlcnZlcihwYXRoLCBvcHRpb25zKTtcbiAgaWYgKCFzZXJ2ZXJVcmwpIHtcbiAgICByZXR1cm4gcGF0aDtcbiAgfVxuXG4gIGlmIChwYXRoLmNoYXJBdCgwKSAhPT0gJy8nKSB7XG4gICAgLy8gY29uc3RydWN0IGZ1bGwgYXBwbGljYXRpb24gdXJsXG4gICAgbGV0IHRlbmFudE9yZ2EgPSBvcHRpb25zLnRlbmFudE9yZ2E7XG4gICAgaWYgKCF0ZW5hbnRPcmdhKSB7XG4gICAgICAvLyBmb2xsb3dpbmcgZXh0cmFjdHMgdGhlIHRlbmFudE9yZ2Egc2V0IG9uIHRoZSBzcGVjaWZpYyBzZXJ2ZXJcbiAgICAgIGNvbnN0IHNlcnZlck9iaiA9IHNlcnZlci5TZXJ2ZXIuZ2V0SW5zdGFuY2Uoc2VydmVyVXJsKTtcbiAgICAgIHRlbmFudE9yZ2EgPSBzZXJ2ZXJPYmouYXBwbHlPcHRpb25zKHtcbiAgICAgICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmxcbiAgICAgIH0pLnRlbmFudE9yZ2E7XG4gICAgICBpZiAoIXRlbmFudE9yZ2EpIHtcbiAgICAgICAgdGVuYW50T3JnYSA9IGluaXQuaW5pdE9wdGlvbnMudGVuYW50T3JnYTtcbiAgICAgICAgaWYgKCF0ZW5hbnRPcmdhKSB7XG4gICAgICAgICAgY29uc3Qgb3JnYW5pemF0aW9uID0gc2VydmVyT2JqLm9yZ2FuaXphdGlvbjtcbiAgICAgICAgICBpZiAob3JnYW5pemF0aW9uKSB7XG4gICAgICAgICAgICB0ZW5hbnRPcmdhID0gb3JnYW5pemF0aW9uLnVuaXF1ZU5hbWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGxldCBhcHBsaWNhdGlvbiA9IG9wdGlvbnMuYXBwbGljYXRpb24gfHwgaW5pdC5pbml0T3B0aW9ucy5hcHBsaWNhdGlvbjtcbiAgICBzZXJ2ZXJVcmwgPSB1cmwucmVzb2x2ZShzZXJ2ZXJVcmwsICcvJyArIHRlbmFudE9yZ2EgKyAnLycgKyBhcHBsaWNhdGlvbiArICcvJyk7XG4gIH1cblxuICByZXR1cm4gdXJsLnJlc29sdmUoc2VydmVyVXJsLCBwYXRoKTtcbn1cblxuLyoqXG4gKiBjb21wdXRlcyB0aGUgYmFzZXBhdGggb2YgYSBCYWFTIGFwcGxpY2F0aW9uLlxuICpcbiAqIEBwYXJhbSBiYXNlQWxpYXNPck5hbWVPckFwcCBiYXNlQWxpYXMgb2YgYXBwbGljYXRpb24sIG1heSBiZSBuYW1lIHdoZW4gYmFzZUFsaWFzIGlzIG5vdCBjaGFuZ2VkXG4gKiAgICBieSBkZXZlbG9wZXIgb3IgYXBwbGljYXRpb24gbWV0YWRhdGEgb2JqZWN0IG9mIFJlbHV0aW9uIHNlcnZlci5cbiAqIEBwYXJhbSBvcHRpb25zIG9mIHNlcnZlciBpbiBlZmZlY3QuXG4gKiBAcmV0dXJuIHtzdHJpbmd9IGFic29sdXRlIFVSTCBvZiBhcHBsaWNhdGlvbiBhbGlhcyBvbiBjdXJyZW50IHNlcnZlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVBcHAoYmFzZUFsaWFzT3JOYW1lT3JBcHA6IGFueSwgb3B0aW9uczogaW5pdC5TZXJ2ZXJVcmxPcHRpb25zID0ge30pOiBzdHJpbmcge1xuICAvLyBkZWZhdWx0cyBvbiBhcmd1bWVudHMgZ2l2ZW5cbiAgbGV0IHVybDogc3RyaW5nO1xuICBpZiAoIWJhc2VBbGlhc09yTmFtZU9yQXBwKSB7XG4gICAgdXJsID0gb3B0aW9ucy5hcHBsaWNhdGlvbiB8fCBpbml0LmluaXRPcHRpb25zLmFwcGxpY2F0aW9uO1xuICB9IGVsc2UgaWYgKF8uaXNTdHJpbmcoYmFzZUFsaWFzT3JOYW1lT3JBcHApKSB7XG4gICAgdXJsID0gYmFzZUFsaWFzT3JOYW1lT3JBcHA7XG4gIH0gZWxzZSB7XG4gICAgdXJsID0gYmFzZUFsaWFzT3JOYW1lT3JBcHAuYmFzZUFsaWFzIHx8IGJhc2VBbGlhc09yTmFtZU9yQXBwLm5hbWU7XG4gIH1cblxuICAvLyBhcHBsaWNhdGlvbiBtdXN0IG5vdCBpbmNsdWRlIHRoZSBsZWFkaW5nIHNsYXNoIGZvciByZXNvbHZlVXJsIHRvIGRvIHRoZSBqb2JcbiAgdXJsID0gdXJsLnJlcGxhY2UoL1xcLz8oLiopLywgJyQxJyk7XG5cbiAgLy8gcmVzb2x2ZSBsb2NhbCBwYXRoIGFnYWluc3QgYXBwbGljYXRpb25cbiAgcmV0dXJuIHJlc29sdmVVcmwoJy4nLCBfLmRlZmF1bHRzKHtcbiAgICBhcHBsaWNhdGlvbjogdXJsXG4gIH0sIG9wdGlvbnMpKTtcbn1cbiJdfQ==