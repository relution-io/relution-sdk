/**
 * @file push/push.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 06.07.2016
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
var _ = require('lodash');
var web = require('../web');
/**
 * endpoint URL of push REST API set up by CLI project generation by default.
 *
 * @type {string}
 */
var pushUrl = 'api/v1/push';
/**
 * posts push notification(s).
 *
 * @param message to deliver.
 * @returns promise of async execution resolving to UUIDs of jobs in asynchronous delivery,
 *    empty when no apps or devices got selected by the message criteria or null when no
 * 		target apps or devices exist at all.
 */
function postPushNotification(message) {
    return web.post(pushUrl, message);
}
exports.postPushNotification = postPushNotification;
/**
 * gets push notification status.
 *
 * @param uuidOrMessage to query.
 * @returns promise of async execution resolving to push Job information.
 */
function fetchPushNotification(uuidOrMessage) {
    var uuid = _.isString(uuidOrMessage) ? uuidOrMessage : uuidOrMessage.uuid;
    return web.get(pushUrl + '/' + uuid);
}
exports.fetchPushNotification = fetchPushNotification;
//# sourceMappingURL=push.js.map