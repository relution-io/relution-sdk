/**
 * @file core/cipher.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 01.07.2016
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
var _ = require('lodash');
// key generation parameters
var pbkdf2SaltLen = 64;
var pbkdf2Iterations = 6911;
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
 * @internal Not part of public API, exported for library use only.
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
 * @internal Not part of public API, exported for library use only.
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
 * computes a hash of some JSON object.
 *
 * @param data to hash.
 * @param algorithm of choice.
 * @return hash value.
 *
 * @internal Not part of public API, exported for library use only.
 */
function hashJson(data, algorithm) {
    return Q(data).then(JSON.stringify).then(JSON.parse).then(function (obj) {
        var hash = crypto.createHash(algorithm);
        (function feed(val) {
            var keys = _.keys(val).sort();
            if (keys.length) {
                hash.update(JSON.stringify(keys), 'utf8');
                _.forEach(keys, function (key) {
                    var value = val[key];
                    if (!_.isUndefined(value)) {
                        if (!_.isObject(value)) {
                            hash.update(JSON.stringify(value), 'utf8');
                        }
                        else {
                            feed(value);
                        }
                    }
                });
            }
        })(obj);
        return hash.digest();
    });
}
exports.hashJson = hashJson;
//# sourceMappingURL=cipher.js.map