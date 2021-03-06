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

import * as url from 'url';
import * as _ from 'lodash';

import * as init from '../core/init';
import * as server from '../security/server';

/**
 * computes a server url from a given path.
 *
 * @param path path to resolve, relative or absolute.
 * @param options of server in effect.
 * @return {string} absolute URL of server.
 */
export function resolveServer(path: string, options: init.ServerUrlOptions = {}): string {
  let serverUrl = options.serverUrl || init.initOptions.serverUrl;
  if (path) {
    if (serverUrl) {
      path = url.resolve(serverUrl, path);
    }
  } else {
    path = serverUrl;
  }
  return url.resolve(path, '/');
}

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
export function resolveUrl(path: string, options: init.ServerUrlOptions = {}): string {
  let serverUrl = resolveServer(path, options);
  if (!serverUrl) {
    return path;
  }

  if (path.charAt(0) !== '/') {
    // construct full application url
    let tenantOrga = options.tenantOrga;
    if (!tenantOrga) {
      // following extracts the tenantOrga set on the specific server
      const serverObj = server.Server.getInstance(serverUrl);
      tenantOrga = serverObj.applyOptions({
        serverUrl: serverUrl
      }).tenantOrga;
      if (!tenantOrga) {
        tenantOrga = init.initOptions.tenantOrga;
        if (!tenantOrga) {
          const organization = serverObj.organization;
          if (organization) {
            tenantOrga = organization.uniqueName;
          }
        }
      }
    }
    let application = options.application || init.initOptions.application;
    serverUrl = url.resolve(serverUrl, '/' + tenantOrga + '/' + application + '/');
  }

  return url.resolve(serverUrl, path);
}

/**
 * computes the basepath of a BaaS application.
 *
 * @param baseAliasOrNameOrApp baseAlias of application, may be name when baseAlias is not changed
 *    by developer or application metadata object of Relution server.
 * @param options of server in effect.
 * @return {string} absolute URL of application alias on current server.
 */
export function resolveApp(baseAliasOrNameOrApp: any, options: init.ServerUrlOptions = {}): string {
  // defaults on arguments given
  let url: string;
  if (!baseAliasOrNameOrApp) {
    url = options.application || init.initOptions.application;
  } else if (_.isString(baseAliasOrNameOrApp)) {
    url = baseAliasOrNameOrApp;
  } else {
    url = baseAliasOrNameOrApp.baseAlias || baseAliasOrNameOrApp.name;
  }

  // application must not include the leading slash for resolveUrl to do the job
  url = url.replace(/\/?(.*)/, '$1');

  // resolve local path against application
  return resolveUrl('.', _.defaults({
    application: url
  }, options));
}
