/*
 * @file core/objectid.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 04.07.2016
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

let machineId = parseInt('' + (Math.random() * Math.pow(16, 6)));
let processId = parseInt('' + (Math.random() * Math.pow(16, 4)));
let counter = parseInt('' + (Math.random() * Math.pow(16, 6)));

function hexString(len: number, num: number) {
  let str = num.toString(16);
  while (str.length < len) {
    str = '0' + str;
  }
  return str.substr(0, len);
}

// random-based impl of Mongo ObjectID
export function makeObjectID(): string {
  return hexString(8, Date.now() / 1000) + // a 4-byte value from the Unix timestamp
         hexString(6, machineId) +         // a 3-byte machine identifier
         hexString(4, processId) +         // a 2-byte process identifier
         hexString(6, counter++);          // a 3-byte counter, starting with a random value.
}
