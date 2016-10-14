/*
 * @file web/online.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 14.10.2016
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

import * as init from '../core/init';
import * as server from '../security/server';

/**
 * version information of Relution server extracted from response header.
 */
export interface ServerInformation {
  /**
   * plain version number of Relution server.
   *
   * This is the value of the X-Relution-Version header: `3.56`, for example.
   */
  version?: string;
  /**
   * human readable full name of Relution server.
   *
   * This is the value of the X-Server header: `Relution/3.56 Enterprise (Wed Sep 28 11:16:00 CEST 2016)`, for example.
   */
  description?: string;
}

/**
 * turns the object deeply immutable.
 *
 * @param serverInfos to freeze.
 * @return {ServerInformation} serverInfos for convenience.
 *
 * @internal for library use only.
 */
export function freezeServerInformation(serverInfos: ServerInformation): ServerInformation {
  return Object.freeze(serverInfos);
}

/**
 * gets the [[ServerInformation]] of the last recent [[ajax]] request.
 *
 * @param serverUrlOrServerUrlOptions url of server or options object, omit to query the current server.
 * @return information object when online, or falsy when offline.
 */
export function getOnlineStatus(serverUrlOrServerUrlOptions: string | init.ServerUrlOptions = init.initOptions.serverUrl): ServerInformation {
  let serverUrl: string;
  if (_.isString(serverUrlOrServerUrlOptions)) {
    serverUrl = serverUrlOrServerUrlOptions;
  } else if (serverUrlOrServerUrlOptions) {
    serverUrl = serverUrlOrServerUrlOptions.serverUrl;
  }
  return server.Server.getInstance(serverUrl).serverInfos;
}
