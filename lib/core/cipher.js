/*
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
/**
 * @module core
 */
/** */
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
function hashJsonSync(data, algorithm) {
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
    })(JSON.parse(JSON.stringify(data)));
    return hash.digest();
}
exports.hashJsonSync = hashJsonSync;
/**
 * computes a hash of some JSON object synchronously.
 *
 * @param data to hash.
 * @param algorithm of choice.
 * @return hash value.
 *
 * @internal Not part of public API, exported for library use only.
 */
function hashJson(data, algorithm) {
    return Q.Promise(function (resolve, reject) {
        try {
            resolve(hashJsonSync(data, algorithm));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.hashJson = hashJson;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2lwaGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvcmUvY2lwaGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBRU4sSUFBWSxNQUFNLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFDakMsSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFDdkIsSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFNUIsNEJBQTRCO0FBQzVCLElBQU0sYUFBYSxHQUFHLEVBQUUsQ0FBQztBQUN6QixJQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQztBQUM5QixJQUFNLFlBQVksR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQzdCLElBQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQztBQUU5QiwwQ0FBMEM7QUFDMUMsMkNBQTJDO0FBQzNDLElBQU0sZUFBZSxHQUFHLGFBQWEsQ0FBQztBQUN0QyxJQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7QUFFdkIsb0JBQW9CO0FBQ3BCLElBQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQVMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzVELElBQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQVMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBY2xEOzs7Ozs7Ozs7OztHQVdHO0FBQ0gscUJBQStCLFFBQWdCLEVBQUUsSUFBTztJQUN0RCxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUNYLFdBQVcsQ0FBQyxhQUFhLENBQUM7UUFDMUIsV0FBVyxDQUFDLFdBQVcsQ0FBQztLQUN6QixDQUFDLENBQUMsTUFBTSxDQUFDLFVBQUMsSUFBWSxFQUFFLEVBQVU7UUFDakMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxZ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XG4gKiBAZmlsZSBjb3JlL2NpcGhlci50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMDEuMDcuMjAxNlxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIGNvcmVcbiAqL1xuLyoqICovXG5cbmltcG9ydCAqIGFzIGNyeXB0byBmcm9tICdjcnlwdG8nO1xuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcblxuLy8ga2V5IGdlbmVyYXRpb24gcGFyYW1ldGVyc1xuY29uc3QgcGJrZGYyU2FsdExlbiA9IDY0O1xuY29uc3QgcGJrZGYySXRlcmF0aW9ucyA9IDY5MTE7XG5jb25zdCBwYmtkZjJLZXlMZW4gPSAxOTIgLyA4O1xuY29uc3QgcGJrZGYyRGlnZXN0ID0gJ3NoYTI1Nic7XG5cbi8vIHNlZSBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNTA4NFxuLy8gY29uc29sZS5sb2coKDxhbnk+Y3J5cHRvKS5nZXRDaXBoZXJzKCkpO1xuY29uc3QgY2lwaGVyQWxnb3JpdGhtID0gJ2Flcy0xOTItZ2NtJztcbmNvbnN0IGNpcGhlckl2TGVuID0gMTI7XG5cbi8vIHByb21pc2VkIHZhcmlhbnRzXG5jb25zdCByYW5kb21CeXRlcyA9IFEuZGVub2RlaWZ5PEJ1ZmZlcj4oY3J5cHRvLnJhbmRvbUJ5dGVzKTtcbmNvbnN0IHBia2RmMiA9IFEuZGVub2RlaWZ5PEJ1ZmZlcj4oY3J5cHRvLnBia2RmMik7XG5cbi8qKlxuICogZW5jcnlwdGVkIG9iamVjdCBkYXRhLlxuICpcbiAqIEBpbnRlcm5hbCBOb3QgcGFydCBvZiBwdWJsaWMgQVBJLCBleHBvcnRlZCBmb3IgbGlicmFyeSB1c2Ugb25seS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbmNyeXB0ZWRKc29uPFQ+IHtcbiAgc2FsdDogc3RyaW5nO1xuICBpdjogc3RyaW5nO1xuICB0YWc/OiBzdHJpbmc7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbi8qKlxuICogZW5jcnlwdHMgYSBKU09OIG9iamVjdCB1c2luZyBhIHVzZXItcHJvdmlkZWQgcGFzc3dvcmQuXG4gKlxuICogVGhpcyBtZXRob2QgaXMgc3VpdGFibGUgZm9yIGh1bWFuLWVudGVyZWQgcGFzc3dvcmRzIGFuZCBub3QgYXBwcm9wcmlhdGUgZm9yIG1hY2hpbmUgZ2VuZXJhdGVkXG4gKiBwYXNzd29yZHMuIE1ha2Ugc3VyZSB0byByZWFkIHJlZ2FyZGluZyBwYmtkZjIuXG4gKlxuICogQHBhcmFtIHBhc3N3b3JkIG9mIGEgaHVtYW4uXG4gKiBAcGFyYW0ganNvbiB0byBlbmNvZGUuXG4gKiBAcmV0dXJuIGVuY29kZWQganNvbiBkYXRhLlxuICpcbiAqIEBpbnRlcm5hbCBOb3QgcGFydCBvZiBwdWJsaWMgQVBJLCBleHBvcnRlZCBmb3IgbGlicmFyeSB1c2Ugb25seS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuY3J5cHRKc29uPFQ+KHBhc3N3b3JkOiBzdHJpbmcsIGpzb246IFQpOiBRLlByb21pc2U8RW5jcnlwdGVkSnNvbjxUPj4ge1xuICByZXR1cm4gUS5hbGwoW1xuICAgIHJhbmRvbUJ5dGVzKHBia2RmMlNhbHRMZW4pLFxuICAgIHJhbmRvbUJ5dGVzKGNpcGhlckl2TGVuKVxuICBdKS5zcHJlYWQoKHNhbHQ6IEJ1ZmZlciwgaXY6IEJ1ZmZlcikgPT4ge1xuICAgIHJldHVybiBwYmtkZjIocGFzc3dvcmQsIHNhbHQsIHBia2RmMkl0ZXJhdGlvbnMsIHBia2RmMktleUxlbiwgcGJrZGYyRGlnZXN0KS50aGVuKChrZXkpID0+IHtcbiAgICAgIGNvbnN0IGNpcGhlciA9IGNyeXB0by5jcmVhdGVDaXBoZXJpdihjaXBoZXJBbGdvcml0aG0sIGtleSwgaXYpO1xuICAgICAgbGV0IHZhbHVlID0gY2lwaGVyLnVwZGF0ZShKU09OLnN0cmluZ2lmeShqc29uKSwgJ3V0ZjgnLCAnYmFzZTY0Jyk7XG4gICAgICB2YWx1ZSArPSBjaXBoZXIuZmluYWwoJ2Jhc2U2NCcpO1xuICAgICAgbGV0IGRhdGE6IEVuY3J5cHRlZEpzb248VD4gPSB7XG4gICAgICAgIHNhbHQ6IHNhbHQudG9TdHJpbmcoJ2Jhc2U2NCcpLFxuICAgICAgICBpdjogaXYudG9TdHJpbmcoJ2Jhc2U2NCcpLFxuICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgIH07XG4gICAgICBsZXQgdGFnID0gY2lwaGVyLmdldEF1dGhUYWcoKTtcbiAgICAgIGlmICh0YWcpIHtcbiAgICAgICAgZGF0YS50YWcgPSB0YWcudG9TdHJpbmcoJ2Jhc2U2NCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIGRlY3J5cHRzIHNvbWUgZW5jb2RlZCBqc29uIGRhdGEuXG4gKlxuICogQHBhcmFtIHBhc3N3b3JkIG9mIGEgaHVtYW4uXG4gKiBAcGFyYW0gZGF0YSBlbmNvZGVkIGpzb24gZGF0YS5cbiAqIEByZXR1cm4ganNvbiB0byBkZWNvZGVkLlxuICpcbiAqIEBpbnRlcm5hbCBOb3QgcGFydCBvZiBwdWJsaWMgQVBJLCBleHBvcnRlZCBmb3IgbGlicmFyeSB1c2Ugb25seS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlY3J5cHRKc29uPFQ+KHBhc3N3b3JkOiBzdHJpbmcsIGRhdGE6IEVuY3J5cHRlZEpzb248VD4pOiBRLlByb21pc2U8VD4ge1xuICBjb25zdCBzYWx0ID0gbmV3IEJ1ZmZlcihkYXRhLnNhbHQsICdiYXNlNjQnKTtcbiAgcmV0dXJuIHBia2RmMihwYXNzd29yZCwgc2FsdCwgcGJrZGYySXRlcmF0aW9ucywgcGJrZGYyS2V5TGVuLCBwYmtkZjJEaWdlc3QpLnRoZW4oKGtleSkgPT4ge1xuICAgIGNvbnN0IGl2ID0gbmV3IEJ1ZmZlcihkYXRhLml2LCAnYmFzZTY0Jyk7XG4gICAgY29uc3QgZGVjaXBoZXIgPSBjcnlwdG8uY3JlYXRlRGVjaXBoZXJpdihjaXBoZXJBbGdvcml0aG0sIGtleSwgaXYpO1xuICAgIGxldCB0YWcgPSBkYXRhLnRhZztcbiAgICBpZiAodGFnKSB7XG4gICAgICBkZWNpcGhlci5zZXRBdXRoVGFnKG5ldyBCdWZmZXIodGFnLCAnYmFzZTY0JykpO1xuICAgIH1cbiAgICBsZXQgdmFsdWUgPSBkZWNpcGhlci51cGRhdGUoZGF0YS52YWx1ZSwgJ2Jhc2U2NCcsICd1dGY4Jyk7XG4gICAgdmFsdWUgKz0gZGVjaXBoZXIuZmluYWwoJ3V0ZjgnKTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH0pLnRoZW4oSlNPTi5wYXJzZSk7XG59XG5cbi8qKlxuICogY29tcHV0ZXMgYSBoYXNoIG9mIHNvbWUgSlNPTiBvYmplY3Qgc3luY2hyb25vdXNseS5cbiAqXG4gKiBQcmVmZXIgdGhlIGFzeW5jIHZhcmlhbnQgaWYgcG9zc2libGUuXG4gKlxuICogQHBhcmFtIGRhdGEgdG8gaGFzaC5cbiAqIEBwYXJhbSBhbGdvcml0aG0gb2YgY2hvaWNlLlxuICogQHJldHVybiBoYXNoIHZhbHVlLlxuICpcbiAqIEBpbnRlcm5hbCBOb3QgcGFydCBvZiBwdWJsaWMgQVBJLCBleHBvcnRlZCBmb3IgbGlicmFyeSB1c2Ugb25seS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc2hKc29uU3luYyhkYXRhOiBhbnksIGFsZ29yaXRobTogc3RyaW5nKTogQnVmZmVyIHtcbiAgY29uc3QgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKGFsZ29yaXRobSk7XG4gIChmdW5jdGlvbiBmZWVkKHZhbDogYW55KSB7XG4gICAgY29uc3Qga2V5cyA9IF8ua2V5cyh2YWwpLnNvcnQoKTtcbiAgICBpZiAoa2V5cy5sZW5ndGgpIHtcbiAgICAgIGhhc2gudXBkYXRlKEpTT04uc3RyaW5naWZ5KGtleXMpLCAndXRmOCcpO1xuICAgICAgXy5mb3JFYWNoKGtleXMsIChrZXkpID0+IHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB2YWxba2V5XTtcbiAgICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKHZhbHVlKSkge1xuICAgICAgICAgIGlmICghXy5pc09iamVjdCh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGhhc2gudXBkYXRlKEpTT04uc3RyaW5naWZ5KHZhbHVlKSwgJ3V0ZjgnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZmVlZCh2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0pKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZGF0YSkpKTtcbiAgcmV0dXJuIGhhc2guZGlnZXN0KCk7XG59XG5cbi8qKlxuICogY29tcHV0ZXMgYSBoYXNoIG9mIHNvbWUgSlNPTiBvYmplY3Qgc3luY2hyb25vdXNseS5cbiAqXG4gKiBAcGFyYW0gZGF0YSB0byBoYXNoLlxuICogQHBhcmFtIGFsZ29yaXRobSBvZiBjaG9pY2UuXG4gKiBAcmV0dXJuIGhhc2ggdmFsdWUuXG4gKlxuICogQGludGVybmFsIE5vdCBwYXJ0IG9mIHB1YmxpYyBBUEksIGV4cG9ydGVkIGZvciBsaWJyYXJ5IHVzZSBvbmx5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzaEpzb24oZGF0YTogYW55LCBhbGdvcml0aG06IHN0cmluZyk6IFEuUHJvbWlzZTxCdWZmZXI+IHtcbiAgcmV0dXJuIFEuUHJvbWlzZTxCdWZmZXI+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB0cnkge1xuICAgICAgcmVzb2x2ZShoYXNoSnNvblN5bmMoZGF0YSwgYWxnb3JpdGhtKSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJlamVjdChlcnJvcik7XG4gICAgfVxuICB9KTtcbn1cbiJdfQ==