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

import * as crypto from 'crypto';
import * as Q from 'q';
import * as _ from 'lodash';

// key generation parameters
const pbkdf2SaltLen = 64;
const pbkdf2Iterations = 6911;
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
 * @internal Not part of public API, exported for library use only.
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
 * @internal Not part of public API, exported for library use only.
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
 * @internal Not part of public API, exported for library use only.
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
 * computes a hash of some JSON object synchronously.
 *
 * Prefer the async variant if possible.
 *
 * @param data to hash.
 * @param algorithm of choice.
 * @return hash value.
 *
 * @internal Not part of public API, exported for library use only.
 */
export function hashJsonSync(data: any, algorithm: string): Buffer {
  const hash = crypto.createHash(algorithm);
  (function feed(val: any) {
    const keys = _.keys(val).sort();
    if (keys.length) {
      hash.update(JSON.stringify(keys), 'utf8');
      _.forEach(keys, (key) => {
        const value = val[key];
        if (!_.isUndefined(value)) {
          if (!_.isObject(value)) {
            hash.update(JSON.stringify(value), 'utf8');
          } else {
            feed(value);
          }
        }
      });
    }
  })(JSON.parse(JSON.stringify(data)));
  return hash.digest();
}

/**
 * computes a hash of some JSON object synchronously.
 *
 * @param data to hash.
 * @param algorithm of choice.
 * @return hash value.
 *
 * @internal Not part of public API, exported for library use only.
 */
export function hashJson(data: any, algorithm: string): Q.Promise<Buffer> {
  return Q.Promise<Buffer>((resolve, reject) => {
    try {
      resolve(hashJsonSync(data, algorithm));
    } catch (error) {
      reject(error);
    }
  });
}
