/**
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

import * as crypto from 'crypto';
import * as Q from 'q';

import * as init from '../core/init';
import * as auth from '../security/auth';
import * as http from './http';

// localStorage of browser or via node-localstorage
const localStorage = global['localStorage'] ||
  (global['localStorage'] = new (require('node-localstorage').LocalStorage)('localStorage'));

// key generation parameters
const pbkdf2SaltLen = 64;
const pbkdf2Iterations = 36911;
const pbkdf2KeyLen = 192 / 8;
const pbkdf2Digest = 'sha256';

// see https://tools.ietf.org/html/rfc5084
// console.log((<any>crypto).getCiphers());
const cipherAlgorithm = 'aes-192-gcm';
const cipherIvLen = 12;

// promised variants
const randomBytes = Q.denodeify<Buffer>(crypto.randomBytes);
const pbkdf2 = Q.denodeify<Buffer>(crypto.pbkdf2);

/**
 * encrypted object data.
 *
 * @internal Not part of public API, exported for test only.
 */
export interface EncryptedJson<T> {
  salt: string;
  iv: string;
  tag?: string;
  value: string;
}

/**
 * encrypts a JSON object using a user-provided password.
 *
 * This method is suitable for human-entered passwords and not appropriate for machine generated
 * passwords. Make sure to read regarding pbkdf2.
 *
 * @param password of a human.
 * @param json to encode.
 * @return encoded json data.
 *
 * @internal Not part of public API, exported for test only.
 */
export function encryptJson<T>(password: string, json: T): Q.Promise<EncryptedJson<T>> {
  return Q.all([
    randomBytes(pbkdf2SaltLen),
    randomBytes(cipherIvLen)
  ]).spread((salt: Buffer, iv: Buffer) => {
    return pbkdf2(password, salt, pbkdf2Iterations, pbkdf2KeyLen, pbkdf2Digest).then((key) => {
      const cipher = crypto.createCipheriv(cipherAlgorithm, key, iv);
      let value = cipher.update(JSON.stringify(json), 'utf8', 'base64');
      value += cipher.final('base64');
      let data: EncryptedJson<T> = {
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        value: value
      };
      let tag = cipher.getAuthTag();
      if (tag) {
        data.tag = tag.toString('base64');
      }
      return data;
    });
  });
}

/**
 * decrypts some encoded json data.
 *
 * @param password of a human.
 * @param data encoded json data.
 * @return json to decoded.
 *
 * @internal Not part of public API, exported for test only.
 */
export function decryptJson<T>(password: string, data: EncryptedJson<T>): Q.Promise<T> {
  const salt = new Buffer(data.salt, 'base64');
  return pbkdf2(password, salt, pbkdf2Iterations, pbkdf2KeyLen, pbkdf2Digest).then((key) => {
    const iv = new Buffer(data.iv, 'base64');
    const decipher = crypto.createDecipheriv(cipherAlgorithm, key, iv);
    let tag = data.tag;
    if (tag) {
      decipher.setAuthTag(new Buffer(tag, 'base64'));
    }
    let value = decipher.update(data.value, 'base64', 'utf8');
    value += decipher.final('utf8');
    return value;
  }).then(JSON.parse);
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
    localStorage.removeItem(computeLocalStorageKey(serverOptions));
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
  return encryptJson(credentials['password'], loginResponse).then((value) => {
    localStorage.setItem(computeLocalStorageKey(serverOptions), JSON.stringify(value));
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
    let value = localStorage.getItem(computeLocalStorageKey(serverOptions));
    if (!value) {
      return Q.resolve<http.LoginResponse>(undefined);
    }
    return decryptJson<http.LoginResponse>(credentials['password'], JSON.parse(value));
  } catch (error) {
    return Q.reject<http.LoginResponse>(error);
  }
}
