/**
 * @file core/init.ts
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

import * as _ from 'lodash';
import * as Q from 'q';

import * as diag from './diag';

// initialize to go in sync with init() call
Q.longStackSupport = diag.debug.enabled;

/**
 * applied on each successful authentication with the Relution server.
 *
 * The function may be executed multiple times, for example when the session times out. The purpose
 * of it is to call application-specific logons passing information such as credentials of 3rd-tier
 * backend servers.
 */
export interface LogonCallback {
  (): Q.Promise<any>;
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
  clientCertificate?: {
    cert?: Buffer;
    passphrase?: string;
  } | any;
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
 */
export function init(options: InitOptions = {}) {
  if ('debug' in options) {
    diag.debug.enabled = options.debug;
    Q.longStackSupport = options.debug;
  }

  _.assign(initOptions, cloneServerInitOptions(options));
}
