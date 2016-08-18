/*
 * @file core/init.ts
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
 * @module core
 */
/** */

import * as tls from 'tls';
import * as _ from 'lodash';
import * as Q from 'q';
import * as url from 'url';
import * as diag from './diag';
import * as device from './device';

// workaround Q promises being inherently incompatible with zone.js used by angular2
Q.nextTick = (function detectNextTick(): typeof Q.nextTick {
  // requires use of Q's nextTick(cb)
  (<any>Q).stopUnhandledRejectionTracking();
  // Q's nextTick(cb) is not compatible with thread-locals,
  // returned function must not be bound as zone.js reassigns global variables
  if (process && !('browser' in process) && process.nextTick) {
    return (cb) => process.nextTick(cb);
  } else if (typeof 'setImmediate' === 'function') {
    return (cb) => setImmediate(cb);
  } else {
    return (cb) => setTimeout(cb, 0);
  }
})();

// initialize to go in sync with init() call
Q.longStackSupport = diag.debug.enabled;

/**
 * applied on each successful authentication with the Relution server.
 *
 * The function may be executed multiple times, for example when the session times out. The purpose
 * of it is to call application-specific logons passing information such as credentials of 3rd-tier
 * backend servers.
 *
 * It is called only as part of online login. Any data returned is stored in
 * `LoginResponse.logonInfos` and will be made available even on offline login.
 */
export interface LogonCallback {
  (value: any): Q.Promise<any> | any;
}

/**
 * specifies additional options for the HTTP agent, advanced operation.
 *
 * In rare cases this field may be useful to alter behavior of the underlying http client.
 */
export interface HttpAgentOptions {
  agentOptions?: any;
  agentClass?: any;
}

/**
 * options selecting Relution server to talk to.
 */
export interface ServerUrlOptions {
  /**
   * absolute url path of (default) Relution server.
   *
   * Notice, the library will work correctly only if the Relution server endpoints are exposed
   * as a (sub-)domain. Operation of Relution at a subpath of URL space is not supported!
   */
  serverUrl?: string;
  /**
   * name of (backend) application as specified in relution.json.
   *
   * It is adviced following the convention of using this name prefixed by a slash as the
   * `baseAlias`. However, in case a different alias is used, set the field to the alias
   * including the slash instead to make the library communicate to the correct endpoint.
   */
  application?: string;
  /**
   * optional tenant [[Organization]] unique name.
   *
   * For fully multi-tenant capable backends this field selects the backend instance the client
   * talks to. The field defaults to using the [[Organization]] of the logon [[User]] which
   * suffices for most use cases.
   *
   * When set to the unique name of an [[Organization]], users of of one [[Organization]] may
   * log into the (backend) [[application]] instance of another [[Organization]] serving as
   * the tenant. Notice, in order to use this feature the tenant [[Organization]] must have
   * at least execute rights on the (backend) [[application]] and the [[User]] using it needs
   * to have read permission on the tenant [[Organization]] used.
   */
  tenantOrga?: string;
}

/**
 * options passed to [[login]] method as well as to [[init]] serving as defaults for HTTP logins.
 */
export interface ServerInitOptions extends ServerUrlOptions, HttpAgentOptions {
  /**
   * (mobile) client app using the (backend) [[application]].
   *
   * When set, the value of this field is send to the Relution server for identification
   * of the app using it. Typically, this is the name or uuid of the app in the appstore.
   */
  clientApp?: string;

  /**
   * optional logon applied after each login.
   *
   * Typically the callback supplied uses connector.configureSession() to transfer required
   * credentials of 3rd-tier backend servers after logon.
   *
   * Notice, logon may be called mutiple times after [[login]] as due to inactivity the server
   * side session may be lost and needs to be reacquired eventually.
   */
  logonCallback?: LogonCallback;

  /**
   * when set, this is used as `pfx` for the requests to the server.
   */
  clientCertificate?: tls.SecureContextOptions;
}

/**
 * creates a deeply independent copy of some [[ServerInitOptions]].
 *
 * @param serverInitOptions to clone.
 * @return {ServerInitOptions} cloned object.
 */
export function cloneServerInitOptions(serverInitOptions: ServerInitOptions): ServerInitOptions {
  let result: ServerInitOptions = {
    serverUrl: serverInitOptions.serverUrl,
    application: serverInitOptions.application,
    clientApp: serverInitOptions.clientApp,
    tenantOrga: serverInitOptions.tenantOrga,
    logonCallback: serverInitOptions.logonCallback,
  };
  if (result.serverUrl && result.serverUrl[result.serverUrl.length - 1] !== '/') {
    result.serverUrl += '/';
  }
  if (serverInitOptions.clientCertificate) {
    result.clientCertificate = _.clone(serverInitOptions.clientCertificate);
  }
  if (serverInitOptions.agentOptions) {
    result.agentOptions = _.clone(serverInitOptions.agentOptions);
  }
  return result;
}

/**
 * optional options passed to [[init]].
 */
export interface InitOptions extends ServerUrlOptions, ServerInitOptions {

  /**
   * when set, reconfigures console debugging and assertion testing of the library.
   *
   * Default setting of the library is debug enabled.
   */
  debug?: boolean;

  /**
   * push configuration of the app.
   *
   * Usually, `init()` is passed some deployment artifact such as the environment constants in an
   * ionic app. When doing so, the push configuration can be specified directly as part of it.
   */
  push?: PhonegapPluginPush.InitOptions;

}

/**
 * copy of options the SDK was initialized with using [[init]] function serving as defaults.
 *
 * @internal for SDK internal use only!
 */
export let initOptions: InitOptions = {};

/**
 * (re)initializes the SDK providing global configuration parameters.
 *
 * @param options of configuration, often these are hardcoded values of the mobile client app.
 * @return promise resolving to Information object as soon as the device is ready.
 */
export function init(options: InitOptions = {}) {

  if ('debug' in options) {
    diag.debug.enabled = options.debug;
    Q.longStackSupport = options.debug;
  }

  if ('serverUrl' in options) {
    const myURL = url.parse(options.serverUrl);
    if (!myURL.protocol && !myURL.host) {
      return Q.reject<device.Information>(new Error(`${options.serverUrl} is not an accepted Url, please add a Host and a Protocol.`));
    }
  }

  _.assignWith(initOptions, cloneServerInitOptions(options),
    (left: any, right: any) => _.isUndefined(right) ? left : right);

  if ('push' in options) {
    initOptions.push = _.cloneDeep(options.push);
  }

  return device.ready;
}
