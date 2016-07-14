/**
 * @file push/registration.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 08.07.2016
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
var Q = require('q');
var diag = require('../core/diag');
var device = require('../core/device');
var init = require('../core/init');
var push = require('./push');
// just keep track of plugin instance and callback
var pushPlugin;
var pushCallback;
// executed when the pushNotification plugin fails internally.
function onPushNotificationError(error) {
    Q(pushCallback(error)).done(undefined, function (e) {
        diag.debug.assert(e === error, 'push callback failed: ' + e.message);
    });
}
// following sets up a promise of the registration
var resolveRegistrationEventResponse;
var rejectRegistrationEventResponse;
var promiseRegistrationEventResponse;
// executed when registration at 3rd party push server succeeded and a registration was issued,
// or a registration is renewed meaning this may be called several times.
function onPushNotificationRegistration(response) {
    if (resolveRegistrationEventResponse) {
        diag.debug.assert(!!rejectRegistrationEventResponse);
        resolveRegistrationEventResponse(response);
        resolveRegistrationEventResponse = undefined;
        rejectRegistrationEventResponse = undefined;
    }
    else {
        promiseRegistrationEventResponse = Q.resolve(response);
    }
    return promiseRegistrationEventResponse.done();
}
// executed on each incoming push notification message calling the pushCallback in an
// error-agnostic fashion.
function onPushNotificationNotification(response) {
    // assignments avoiding changes of implementation state during promise chain
    var plugin = pushPlugin;
    var callback = pushCallback;
    return Q(response).then(function (r) {
        diag.debug.assert(r === response, 'just begins promise chain avoiding explicit try-catch');
        return callback(undefined, response) || response;
    }).then(function (r) {
        diag.debug.assert(r === response, 'push callback must respond same object');
        return Q.Promise(function (resolve, reject) {
            try {
                if ('notId' in response.additionalData) {
                    plugin.finish(resolve, reject, response.additionalData.notId);
                }
                else {
                    plugin.finish(resolve, reject);
                }
            }
            catch (error) {
                reject(error);
            }
        });
    }).done(undefined, function (error) {
        return Q(callback(error, response) || response).catch(function (e) {
            diag.debug.assert(e === error, 'push callback failed: ' + e.message);
            return response;
        });
    });
}
/**
 * installs a callback for receiving push notification messages, and registers the device with the
 * 3rd party push service provider.
 *
 * Usually push configuration is provided to `init()` and a call to this method is chained passing
 * the sink callback. Application using an explicit login then call `configurePushDevice()` as part
 * of the `LogonCallback` while anonymous applications call the latter directly.
 *
 * In general it is not wise to unregister from push messages. However, this functionality is
 * available by passing `undefined` as callback.
 *
 * @param callback to install, or undefined to unregister.
 * @return promise of registration, for informal purposes.
 */
function listenPushNotification(callback) {
    if (resolveRegistrationEventResponse) {
        diag.debug.assert(!!rejectRegistrationEventResponse);
        resolveRegistrationEventResponse(undefined);
        resolveRegistrationEventResponse = undefined;
        rejectRegistrationEventResponse = undefined;
    }
    if (callback) {
        // perform registration
        promiseRegistrationEventResponse = device.ready.then(function (info) {
            var pushInitOptions = init.initOptions.push;
            var pushPlatform = info.platform.id;
            if (pushPlatform === 'windowsphone') {
                pushPlatform = 'windows';
            }
            if (!pushInitOptions || !pushPlatform || !(pushPlatform in pushInitOptions)) {
                // no push configuration for current platform
                promiseRegistrationEventResponse = Q.resolve(undefined);
                return promiseRegistrationEventResponse;
            }
            // init or reinit push
            var pushStatic = global['PushNotification'];
            var pushImpl = pushStatic.init(pushInitOptions);
            if (pushPlugin !== pushImpl) {
                if (pushPlugin) {
                    // turn off existing event handlers (in reverse order of registration)
                    pushPlugin.off('notification', onPushNotificationNotification);
                    pushPlugin.off('registration', onPushNotificationRegistration);
                    pushPlugin.off('error', onPushNotificationError);
                }
                // set up new registration results
                promiseRegistrationEventResponse = Q.Promise(function (resolve, reject) {
                    resolveRegistrationEventResponse = resolve;
                    rejectRegistrationEventResponse = reject;
                });
                // activation of new implementation
                pushCallback = callback;
                pushPlugin = pushImpl;
                // turn on event handlers (in order of relevance)
                pushPlugin.on('error', onPushNotificationError);
                pushPlugin.on('registration', onPushNotificationRegistration);
                pushPlugin.on('notification', onPushNotificationNotification);
            }
            return promiseRegistrationEventResponse;
        });
    }
    else if (pushPlugin) {
        // perform unregistration
        promiseRegistrationEventResponse = Q.Promise(function (resolve, reject) {
            try {
                pushPlugin.unregister(resolve, reject);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    else {
        // nothing to unregister
        promiseRegistrationEventResponse = Q.resolve(undefined);
    }
    return promiseRegistrationEventResponse;
}
exports.listenPushNotification = listenPushNotification;
/**
 * authorizes current Relution server logged onto to send push notifications by transmitting the
 * registration token.
 */
function configurePushDevice(options) {
    return Q.when(promiseRegistrationEventResponse, function (registrationEventResponse) {
        if (!registrationEventResponse) {
            // either there is no configuration or since this method was called,
            // registration was canceled
            return Q.resolve(undefined);
        }
        // remaining implementation in push.ts as this is independent of Cordova...
        return push.registerPushDevice(registrationEventResponse.registrationId, options);
    });
}
exports.configurePushDevice = configurePushDevice;
//# sourceMappingURL=cordova.js.map