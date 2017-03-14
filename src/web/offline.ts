/*
 * @file web/offline.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 30.06.2016
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

import * as Q from 'q';
import * as auth from '../security/auth';
import * as cipher from '../core/cipher';
import * as http from './http';
import * as init from '../core/init';

/**
 * localStorage of browser or via require node-localstorage.
 *
 * @internal Not public API, exported for testing purposes only!
 */
export function localStorage() {
  return global['localStorage'] ||
    process && !process['browser'] && (global['localStorage'] =
      new (require('node-localstorage').LocalStorage)('localStorage')); // required version
}

/**
 * computes key of login response data for some server.
 *
 * @param serverOptions providing server URL so that keys do not collide.
 * @return {string} key suitable for local storage.
 */
function computeLocalStorageKey(serverOptions: init.ServerUrlOptions) {
  const uniqueModuleName = module.filename || __filename;
  return uniqueModuleName + '-' + serverOptions.serverUrl;
}

/**
 * deletes stored login response of some server.
 *
 * @param credentials allowing to differentiate when multiple logins are used simultaneously, may
 *  be null to forget just anything.
 * @param serverOptions identifying the server.
 * @return {Promise<void>} indicating success or failure.
 *
 * @internal Not part of public API, for library use only.
 */
export function clearOfflineLogin(credentials: auth.Credentials,
                                  serverOptions: init.ServerUrlOptions): Q.Promise<void> {
  // simultaneous logins using different credentials is not realized so far,
  // so that the credentials parameter is irrelevant, but provided for the
  // sake of completeness...
  try {
    localStorage().removeItem(computeLocalStorageKey(serverOptions));
    return Q.resolve<void>(undefined);
  } catch (error) {
    return Q.reject<void>(error);
  }
}

/**
 * writes response data to persistent storage for offline login purposes.
 *
 * @param credentials required for encryption.
 * @param serverOptions identifying the server.
 * @param loginResponse permitted to durable storage.
 * @return {Promise<http.LoginResponse>} indicating success or failure.
 *
 * @internal Not part of public API, for library use only.
 */
export function storeOfflineLogin(credentials: auth.Credentials,
                                  serverOptions: init.ServerUrlOptions,
                                  loginResponse: http.LoginResponse):
Q.Promise<http.LoginResponse> {
  return cipher.encryptJson(credentials['password'], loginResponse).then((value) => {
    localStorage().setItem(computeLocalStorageKey(serverOptions), JSON.stringify(value));
    return loginResponse;
  });
}

/**
 * reads response data from persistent storage.
 *
 * When there is no data in persitent store, the operation does NOT fail. In this case the
 * resulting promise resolves to nil instead.
 *
 * @param credentials required for decryption.
 * @param serverOptions identifying the server.
 * @return {Promise<http.LoginResponse>} read from store, resolves to nil when there is no data,
 *  gets rejected when decryption fails.
 *
 * @internal Not part of public API, for library use only.
 */
export function fetchOfflineLogin(credentials: auth.Credentials,
                                  serverOptions: init.ServerUrlOptions):
Q.Promise<http.LoginResponse> {
  try {
    let value = localStorage().getItem(computeLocalStorageKey(serverOptions));
    if (!value) {
      return Q.resolve<http.LoginResponse>(undefined);
    }
    return cipher.decryptJson<http.LoginResponse>(credentials['password'], JSON.parse(value));
  } catch (error) {
    return Q.reject<http.LoginResponse>(error);
  }
}

export const emptyInternal = () => {
  return 'hello';
}
