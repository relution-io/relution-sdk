/**
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
"use strict";
var machineId = parseInt('' + (Math.random() * Math.pow(16, 6)));
var processId = parseInt('' + (Math.random() * Math.pow(16, 4)));
var counter = parseInt('' + (Math.random() * Math.pow(16, 6)));
function hexString(len, num) {
    var str = num.toString(16);
    while (str.length < len) {
        str = '0' + str;
    }
    return str.substr(0, len);
}
// random-based impl of Mongo ObjectID
function makeObjectID() {
    return hexString(8, Date.now() / 1000) +
        hexString(6, machineId) +
        hexString(4, processId) +
        hexString(6, counter++); // a 3-byte counter, starting with a random value.
}
exports.makeObjectID = makeObjectID;
//# sourceMappingURL=objectid.js.map