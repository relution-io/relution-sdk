/*
 * @file connector/connector.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 03.05.2016
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
 * @module connector
 */
/** */

import * as Q from 'q';

import * as web from '../web';

/**
 * endpoint URL of connectors REST API set up by CLI project generation by default.
 *
 * @type {string}
 */
const connectorsUrl = 'api/v1/connectors';

/**
 * provides per-user connection properties to be stored as part of the session,
 * such as credentials for a given connection.
 *
 * <p>
 * All parameters in properties are copied to the transient session store,
 * overwriting any already existing values. To delete a previously stored
 * parameter, provide an empty value explicitly.
 * </p>
 *
 * @param name of connection.
 * @param properties to store in session.
 * @returns promise of async execution.
 */
export function configureSession(name: string, properties: any): Q.Promise<any> {
  return web.post(connectorsUrl + '/' + name, properties);
}

/**
 * executes a call on a connection.
 *
 * @param name of connection.
 * @param call name.
 * @param input data, i.e. an instance of a model or object compatible to the
 * 		model in terms of attributes defined.
 * @returns promise providing output/error.
 */
export function runCall(name: string, call: string, input: any): Q.Promise<any> {
  return web.post(connectorsUrl + '/' + name + '/' + call, input);
}
