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

import * as diag from './diag';

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
 * options passed to [[login]] method as well as to [[init]] serving as defaults for HTTP logins.
 */
export interface ServerUrlOptions {
  /**
   * absolute url path of (default) Relution server.
   */
  serverUrl?: string;

  /**
   * name of (backend) application as specified in relution.json.
   */
  application?: string;

  /**
   * optional logon applied after each login.
   */
  logonCallback?: LogonCallback;

  /**
   * when set, this is used as `pfx` for the requests to the server.
   */
  clientCertificate?: {
    cert?: Buffer;
    passphrase?: string;
  } | any;

  /**
   * specifies additional options for the HTTP agent, advanced operation.
   */
  agentOptions?: any;
}

export function cloneServerUrlOptions(serverUrlOptions: ServerUrlOptions): ServerUrlOptions {
  let result: ServerUrlOptions = {
    serverUrl: serverUrlOptions.serverUrl,
    application: serverUrlOptions.application,
    logonCallback: serverUrlOptions.logonCallback,
  };
  if (serverUrlOptions.clientCertificate) {
    result.clientCertificate = _.clone(serverUrlOptions.clientCertificate);
  }
  if (serverUrlOptions.agentOptions) {
    result.agentOptions = _.clone(serverUrlOptions.agentOptions);
  }
  return result;
}

/**
 * optional options passed to [[init]].
 */
export interface InitOptions extends ServerUrlOptions {

  /**
   * when set, reconfigures console debugging and assertion testing of the library.
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
  }

  _.assign(initOptions, cloneServerUrlOptions(options));
}
