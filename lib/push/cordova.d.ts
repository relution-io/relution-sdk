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
import * as Q from 'q';
/**
 * an incoming push notification message.
 */
export declare type PushMessage = PhonegapPluginPush.NotificationEventResponse;
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
export declare type PushCallback = (error: Error, message?: PushMessage) => PushMessage | Q.Promise<PushMessage>;
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
export declare function listenPushNotification(callback: PushCallback): Q.Promise<PhonegapPluginPush.RegistrationEventResponse>;
/**
 * authorizes current Relution server logged onto to send push notifications by transmitting the
 * registration token.
 */
export declare function configurePushDevice(): void;
