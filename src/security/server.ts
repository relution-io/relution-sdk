/**
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

import * as url from 'url';
import * as assert from 'assert';
import * as _ from 'lodash';

import * as init from '../core/init';
import * as diag from '../core/diag';

import * as auth from './auth';
import * as roles from './roles';

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
 * @return {string} absolute URL of path on current server.
 */
export function resolveUrl(path: string, options: init.ServerUrlOptions = {}): string {
  let serverUrl = options.serverUrl || init.initOptions.serverUrl;
  if (!serverUrl) {
    return path;
  }

  if (path.charAt(0) !== '/') {
    // construct full application url
    let tenantOrga = options.tenantOrga || init.initOptions.tenantOrga;
    let application = options.application || init.initOptions.application;
    serverUrl = url.resolve(serverUrl, '/' + tenantOrga + '/' + application + '/');
  }

  return url.resolve(serverUrl, path);
}

/**
 * per-server state management.
 *
 * @internal for library use only.
 */
export class Server {

  /**
   * servers by url.
   */
  private static servers: {
    [url: string]: Server;
  } = {};

  public static getInstance(serverUrl: string = init.initOptions.serverUrl): Server {
    if (!serverUrl) {
      throw new Error('no server set');
    }
    diag.debug.assert(() => serverUrl[serverUrl.length - 1] === '/', serverUrl);
    let server = Server.servers[serverUrl];
    if (!server) {
      server = new Server(serverUrl);
      Server.servers[serverUrl] = server;
    }
    return server;
  }

  public makeCurrent() {
    init.initOptions.serverUrl = this.options.serverUrl;
  }

  /**
   * current set of options in effect for this server.
   */
  private options: init.ServerInitOptions;

  // security state
  private state: {
    authorization: auth.Authorization,
    /**
     * storage of [[Organization]] in effect.
     *
     * Uses null instead of {} for empty value so you can test using if statement via cohersion to
     * boolean.
     *
     * @type {Organization} in effect, may be null.
     */
    organization: roles.Organization,
    user: roles.User,
    /**
     * copy of credentials required for reestablishing the session when it timed out, for example.
     */
    credentials: auth.Credentials
  } = {
    authorization: auth.ANONYMOUS_AUTHORIZATION,
    organization: null,
    user: null,
    credentials: null
  };

  /**
   * last seen X-Gofer-User header value indicating a server session.
   */
  public sessionUserUuid: string;

  constructor(serverUrl: string) {
    this.options = init.cloneServerInitOptions(init.initOptions);
    this.options.serverUrl = serverUrl;
  }

  /**
   * used to update options.
   *
   * @param opts to apply.
   * @return {*} updated options.
   */
  public applyOptions(serverInitOptions: init.ServerInitOptions): init.ServerInitOptions {
    diag.debug.assert(() => this.options.serverUrl === serverInitOptions.serverUrl);
    return _.assignWith(this.options, serverInitOptions, (left: any, right: any) => _.isUndefined(right) ? left : right);
  }

  get authorization(): auth.Authorization {
    return this.state.authorization;
  }
  set authorization(authorization: auth.Authorization) {
    if (authorization && authorization != auth.ANONYMOUS_AUTHORIZATION) {
      this.state.authorization = auth.freezeAuthorization(authorization);
    } else {
      this.state.authorization = auth.ANONYMOUS_AUTHORIZATION;
    }
  }

  get organization(): roles.Organization {
    return this.state.organization;
  }
  set organization(organization: roles.Organization) {
    if (organization) {
      this.state.organization = roles.freezeOrganization(organization);
      if (!this.options.tenantOrga) {
        this.options.tenantOrga = organization.uniqueName;
      }
    } else {
      this.state.organization = null;
    }
  }

  get user(): roles.User {
    return this.state.user;
  }
  set user(user: roles.User) {
    if (user) {
      this.state.user = roles.freezeUser(user);
    } else {
      this.state.user = null;
    }
  }

  get credentials(): auth.Credentials {
    return this.state.credentials;
  }
  set credentials(credentials: auth.Credentials) {
    if (credentials) {
      this.state.credentials = auth.freezeCredentials(auth.cloneCredentials(credentials));
    } else {
      this.state.credentials = null;
    }
  }

}

/**
 * gets the current [[Server]].
 *
 * @param serverUrl to get state of.
 * @return {Server} state parameter.
 *
 * @internal for library use only.
 */
export function getCurrentServer(): Server {
  return Server.getInstance();
}
/**
 * sets the current [[Server]].
 *
 * @param server to set state of.
 *
 * @internal for library use only.
 */
export function setCurrentServer(server: Server) {
  if (server) {
    server.makeCurrent();
    assert.strictEqual(getCurrentServer(), server);
  } else {
    init.initOptions.serverUrl = null;
  }
}

/**
 * gets the [[Authorization]] in effect.
 *
 * @return {Authorization} in effect, may be null.
 */
export function getCurrentAuthorization(): auth.Authorization {
  return getCurrentServer().authorization;
}

/**
 * gets the [[Organization]] in effect.
 *
 * @param fields of interest.
 * @return {Organization} in effect, may be null.
 */
export function getCurrentOrganization(...fields: string[]): roles.Organization {
  return getCurrentServer().organization;
}
/**
 * sets the [[Organization]].
 *
 * @param organization to set.
 */
export function setCurrentOrganization(organization: roles.Organization) {
  getCurrentServer().organization = organization;
  assert.equal(getCurrentOrganization(), organization);
}

/**
 * gets the [[User]] in effect.
 *
 * @param fields of interest.
 * @return {User} in effect, may be null.
 */
export function getCurrentUser(...fields: string[]): roles.User {
  return getCurrentServer().user;
}
