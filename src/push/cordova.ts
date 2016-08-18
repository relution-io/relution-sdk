/*
 * @file push/cordova.ts
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
/**
 * @module push
 */
/** */

import * as Q from 'q';

import * as diag from '../core/diag';
import * as device from '../core/device';
import * as init from '../core/init';
import * as push from './push';

/**
 * an incoming push notification message.
 */
export type PushMessage = PhonegapPluginPush.NotificationEventResponse;

/**
 * receives incoming push notification messages once registered using `listenPushNotification()`.
 *
 * For each incoming push notification message the callback is executed performing some
 * app-specific action. The caller will wait until the optionally returned promise gets
 * resolved, before signalling the operating system the message got processed completely.
 *
 * Notice, the next push notification message may be passed to the callback even before the
 * returned promise completed. This is, the optional promise returned just controls when the
 * end of processing gets signalled to the operating system, but not when the app is ready.
 *
 * Also, care must be taken as processing of a push notification message must not exceed
 * more than 30s according to push plugin documentation at
 * https://github.com/phonegap/phonegap-plugin-push/blob/master/docs/PAYLOAD.md.
 * For that reason it makes no sense to display some blocking user interface here!
 *
 * If during any of these steps some error is detected, the callback is executed. This holds
 * even when during processing of a push notification message the callback itself signalled
 * an error. In this case, both parameters are supplied.
 */
export type PushCallback =
  (error: Error, pushMessage?: PushMessage) => PushMessage | Q.Promise<PushMessage>;

// just keep track of plugin instance and callback
let pushPlugin: PhonegapPluginPush.PushNotification;
let pushCallback: PushCallback;

// executed when the pushNotification plugin fails internally.
function onPushNotificationError(error: Error) {
  Q(pushCallback(error)).done(undefined, (e) => {
    diag.debug.assert(e === error, 'push callback failed: ' + e.message);
  });
}

// following sets up a promise of the registration
let resolveRegistrationEventResponse: (value: PhonegapPluginPush.RegistrationEventResponse) => void;
let rejectRegistrationEventResponse: (reason: Error) => void;
let promiseRegistrationEventResponse: Q.Promise<PhonegapPluginPush.RegistrationEventResponse>;

// executed when registration at 3rd party push server succeeded and a registration was issued,
// or a registration is renewed meaning this may be called several times.
function onPushNotificationRegistration(response: PhonegapPluginPush.RegistrationEventResponse) {
  if (resolveRegistrationEventResponse) {
    diag.debug.assert(!!rejectRegistrationEventResponse);
    resolveRegistrationEventResponse(response);
    resolveRegistrationEventResponse = undefined;
    rejectRegistrationEventResponse = undefined;
  } else {
    promiseRegistrationEventResponse = Q.resolve(response);
  }
  return promiseRegistrationEventResponse.done();
}

// executed on each incoming push notification message calling the pushCallback in an
// error-agnostic fashion.
function onPushNotificationNotification(response: PhonegapPluginPush.NotificationEventResponse) {
  // assignments avoiding changes of implementation state during promise chain
  const plugin = pushPlugin;
  const callback = pushCallback;
  return Q(response).then((r) => {
    diag.debug.assert(r === response, 'just begins promise chain avoiding explicit try-catch');
    return callback(undefined, response) || response;
  }).then((r) => {
    diag.debug.assert(r === response, 'push callback must respond same object');
    return Q.Promise((resolve, reject) => {
      try {
        if ('notId' in response.additionalData) {
          plugin.finish(<any>resolve, <any>reject, response.additionalData.notId);
        } else {
          plugin.finish(<any>resolve, <any>reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }).done(undefined, (error) => {
    return Q(callback(error, response) || response).catch((e) => {
      diag.debug.assert(e === error, 'push callback failed: ' + e.message);
      return response;
    });
  });
}

/**
 * default implementation of PushCallback reporting errors and incoming messages to the console.
 *
 * @param error cause of failure.
 * @param pushMessage incoming notification data.
 *
 * @return {PushMessage} same value as parameter causing confirmation of message.
 */
function defaultPushCallback(error: Error, pushMessage?: PushMessage) {
  if (error) {
    diag.debug.error('push failure', error);
  } else if (pushMessage && pushMessage.message) {
    diag.debug.info('push received', pushMessage.message);
  }
  return pushMessage;
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
 * available by passing `null` as callback.
 *
 * @param callback to install, or explicitly null to unregister.
 * @return promise of registration, for informal purposes.
 */
export function listenPushNotification(callback: PushCallback = defaultPushCallback):
                                          Q.Promise<PhonegapPluginPush.RegistrationEventResponse> {
  if (resolveRegistrationEventResponse) {
    diag.debug.assert(!!rejectRegistrationEventResponse);
    resolveRegistrationEventResponse(undefined);
    resolveRegistrationEventResponse = undefined;
    rejectRegistrationEventResponse = undefined;
  }

  if (callback) {
    // perform registration
    promiseRegistrationEventResponse = device.ready.then((info) => {
      const pushInitOptions = init.initOptions.push;
      let pushPlatform: string = info.platform.id;
      if (pushPlatform === 'windowsphone') {
        pushPlatform = 'windows';
      }
      if (!pushInitOptions || !pushPlatform || !(pushPlatform in pushInitOptions)) {
        // no push configuration for current platform
        promiseRegistrationEventResponse = Q.resolve<PhonegapPluginPush.RegistrationEventResponse>(undefined);
        return promiseRegistrationEventResponse;
      }

      // init or reinit push
      const pushStatic: PhonegapPluginPush.PushNotificationStatic = global['PushNotification'];
      const pushImpl = pushStatic.init(pushInitOptions);
      if (pushPlugin !== pushImpl) {
        if (pushPlugin) {
          // turn off existing event handlers (in reverse order of registration)
          pushPlugin.off('notification', onPushNotificationNotification);
          pushPlugin.off('registration', onPushNotificationRegistration);
          pushPlugin.off('error', onPushNotificationError);
        }

        // set up new registration results
        promiseRegistrationEventResponse = Q.Promise<PhonegapPluginPush.RegistrationEventResponse>((resolve, reject) => {
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
  } else if (pushPlugin) {
    // perform unregistration
    promiseRegistrationEventResponse = Q.Promise<PhonegapPluginPush.RegistrationEventResponse>((resolve, reject) => {
      try {
        pushPlugin.unregister(<any>resolve, <any>reject);
      } catch (error) {
        reject(error);
      }
    });
  } else {
    // nothing to unregister
    promiseRegistrationEventResponse = Q.resolve<PhonegapPluginPush.RegistrationEventResponse>(undefined);
  }
  return promiseRegistrationEventResponse;
}

/**
 * authorizes current Relution server logged onto to send push notifications by transmitting the
 * registration token.
 */
export function configurePushDevice(options?: push.RegistrationOptions): Q.Promise<push.Device> {
  return Q.when(promiseRegistrationEventResponse, (registrationEventResponse) => {
    if (!registrationEventResponse) {
      // either there is no configuration or since this method was called,
      // registration was canceled
      return Q.resolve<push.Device>(undefined);
    }

    // remaining implementation in push.ts as this is independent of Cordova...
    return push.registerPushDevice(registrationEventResponse.registrationId, options);
  });
}
