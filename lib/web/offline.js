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
"use strict";
var Q = require('q');
var cipher = require('../core/cipher');
/**
 * localStorage of browser or via require node-localstorage.
 *
 * @internal Not public API, exported for testing purposes only!
 */
function localStorage() {
    return global['localStorage'] ||
        process && !process['browser'] && (global['localStorage'] =
            new (require('node-localstorage').LocalStorage)('localStorage')); // required version
}
exports.localStorage = localStorage;
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
        localStorage().removeItem(computeLocalStorageKey(serverOptions));
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
    return cipher.encryptJson(credentials['password'], loginResponse).then(function (value) {
        localStorage().setItem(computeLocalStorageKey(serverOptions), JSON.stringify(value));
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
        var value = localStorage().getItem(computeLocalStorageKey(serverOptions));
        if (!value) {
            return Q.resolve(undefined);
        }
        return cipher.decryptJson(credentials['password'], JSON.parse(value));
    }
    catch (error) {
        return Q.reject(error);
    }
}
exports.fetchOfflineLogin = fetchOfflineLogin;
//# sourceMappingURL=offline.js.map