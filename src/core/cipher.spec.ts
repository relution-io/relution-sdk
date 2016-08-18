/*
 * @file web/cipher.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 01.07.2016
 * Copyright 2016 M-Way Solutions GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @module core
 */
/** */

import * as Q from 'q';
import * as assert from 'assert';

import * as cipher from './cipher';

describe(module.filename || __filename, function() {
  return [

    it('encryption correct password', () => {
      const password = 'test123#!';
      const someData = {
        a: 1,
        b: 2,
        c: <any>null
      };
      return cipher.encryptJson(password, someData).then((encryptedData) => {
        return cipher.decryptJson(password, encryptedData);
      }).then((decrytedData) => {
        assert.deepEqual(decrytedData, someData, 'decryption yields same data');
        return true;
      });
    }),

    it('encryption incorrect password', () => {
      const password = 'test123#!';
      const someData = {
        a: 1,
        b: 2,
        c: <any>null
      };
      return cipher.encryptJson(password, someData).then((encryptedData) => {
        return cipher.decryptJson('Test123#!', encryptedData);
      }).then((): boolean => {
        assert.fail('decryption succeeded although passwords differ!');
        throw new Error('never reached');
      }, () => {
        return true; // expected failure
      });
    }),

    it('hash nilly border cases', () => {
      return Q.all([
        cipher.hashJson({
          // empty
        }, 'sha256').then((buffer) => {
          assert.equal(buffer.toString('base64'), '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=');
          return true;
        }),

        cipher.hashJson({
          value: undefined
        }, 'sha256').then((buffer) => {
          assert.equal(buffer.toString('base64'), '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=');
          return true;
        }),

        cipher.hashJson({
          value: null
        }, 'sha256').then((buffer) => {
          assert.notEqual(buffer.toString('base64'), '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=');
          return true;
        })

      ]);
    }),

    it('hash order invariant', () => {
      // if the following actually tests anything depends on whether the JavaScript engine
      // enumerates properties in declaration order...
      return Q.all([
        cipher.hashJson({
          abc: 'jhfepioapwe',
          def: 'hq839rew432',
          0: 'jfirewjtgerjwp',
          gjire: {
            ghiore: 6795432,
            poqeiq: 'tgdrqage',
            12: 84239,
            gsdajk: 1940
          }
        }, 'sha256'),
        cipher.hashJson({
          def: 'hq839rew432',
          gjire: {
            12: 84239,
            poqeiq: 'tgdrqage',
            gsdajk: 1940,
            ghiore: 6795432
          },
          0: 'jfirewjtgerjwp',
          abc: 'jhfepioapwe'
        }, 'sha256')
      ]).spread((a, b) => {
        assert.equal(a.toString('base64'), b.toString('base64'));
        return true;
      });
    }),

    it('hash Q library', () => {
      return cipher.hashJson(Q, 'sha256').then(() => {
        assert.fail('hashing functions should not really work!');
        return false; // never reached
      }, () => {
        return true; // absolutely acceptable
      });
    })

  ];
});
