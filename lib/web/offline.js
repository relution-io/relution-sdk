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
"use strict";
var crypto = require('crypto');
var Q = require('q');
// localStorage of browser or via node-localstorage
var localStorage = global['localStorage'] ||
    (global['localStorage'] = new (require('node-localstorage').LocalStorage)('localStorage'));
// key generation parameters
var pbkdf2SaltLen = 64;
var pbkdf2Iterations = 36911;
var pbkdf2KeyLen = 192 / 8;
var pbkdf2Digest = 'sha256';
// see https://tools.ietf.org/html/rfc5084
// console.log((<any>crypto).getCiphers());
var cipherAlgorithm = 'aes-192-gcm';
var cipherIvLen = 12;
// promised variants
var randomBytes = Q.denodeify(crypto.randomBytes);
var pbkdf2 = Q.denodeify(crypto.pbkdf2);
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
function encryptJson(password, json) {
    return Q.all([
        randomBytes(pbkdf2SaltLen),
        randomBytes(cipherIvLen)
    ]).spread(function (salt, iv) {
        return pbkdf2(password, salt, pbkdf2Iterations, pbkdf2KeyLen, pbkdf2Digest).then(function (key) {
            var cipher = crypto.createCipheriv(cipherAlgorithm, key, iv);
            var value = cipher.update(JSON.stringify(json), 'utf8', 'base64');
            value += cipher.final('base64');
            var data = {
                salt: salt.toString('base64'),
                iv: iv.toString('base64'),
                value: value
            };
            var tag = cipher.getAuthTag();
            if (tag) {
                data.tag = tag.toString('base64');
            }
            return data;
        });
    });
}
exports.encryptJson = encryptJson;
/**
 * decrypts some encoded json data.
 *
 * @param password of a human.
 * @param data encoded json data.
 * @return json to decoded.
 *
 * @internal Not part of public API, exported for test only.
 */
function decryptJson(password, data) {
    var salt = new Buffer(data.salt, 'base64');
    return pbkdf2(password, salt, pbkdf2Iterations, pbkdf2KeyLen, pbkdf2Digest).then(function (key) {
        var iv = new Buffer(data.iv, 'base64');
        var decipher = crypto.createDecipheriv(cipherAlgorithm, key, iv);
        var tag = data.tag;
        if (tag) {
            decipher.setAuthTag(new Buffer(tag, 'base64'));
        }
        var value = decipher.update(data.value, 'base64', 'utf8');
        value += decipher.final('utf8');
        return value;
    }).then(JSON.parse);
}
exports.decryptJson = decryptJson;
/**
 * computes key of login response data for some server.
 *
 * @param serverOptions providing server URL so that keys do not collide.
 * @return {string} key suitable for local storage.
 */
function computeLocalStorageKey(serverOptions) {
    var uniqueModuleName = module.filename || __filename;
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
function clearOfflineLogin(credentials, serverOptions) {
    // simultaneous logins using different credentials is not realized so far,
    // so that the credentials parameter is irrelevant, but provided for the
    // sake of completeness...
    try {
        localStorage.removeItem(computeLocalStorageKey(serverOptions));
        return Q.resolve(undefined);
    }
    catch (error) {
        return Q.reject(error);
    }
}
exports.clearOfflineLogin = clearOfflineLogin;
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
function storeOfflineLogin(credentials, serverOptions, loginResponse) {
    return encryptJson(credentials['password'], loginResponse).then(function (value) {
        localStorage.setItem(computeLocalStorageKey(serverOptions), JSON.stringify(value));
        return loginResponse;
    });
}
exports.storeOfflineLogin = storeOfflineLogin;
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
function fetchOfflineLogin(credentials, serverOptions) {
    try {
        var value = localStorage.getItem(computeLocalStorageKey(serverOptions));
        if (!value) {
            return Q.resolve(undefined);
        }
        return decryptJson(credentials['password'], JSON.parse(value));
    }
    catch (error) {
        return Q.reject(error);
    }
}
exports.fetchOfflineLogin = fetchOfflineLogin;
//# sourceMappingURL=offline.js.map