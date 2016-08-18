/*
 * @file core/device.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 07.07.2016
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

import * as Q from 'q';

import * as diag from './diag';
import * as domain from './domain';

/**
 * platform IDs compatible to constants of ionic.
 *
 * Notice, `io.js` is treated as `node` here. You may choose to use `process.platform` to further
 * differentiate on desktops or `window.device.platform` on mobile devices. Both of this is exposed
 * as `Information.platform.name`. That said, you should avoid platform-specific code of that level
 * entirely.
 */
export type PlatformId =
  // can not use constants here, TypeScript does not allow this currently
  'android' |
  'ios' |
  'windowsphone' |
  'blackberry' |
  'browser' |
  'node';

/**
 * additional information provided by forked device plugin of M-Way Labs.
 *
 * Notice, all additional properties are optional as it can not be guaranteed that the device
 * plugin is the modified version.
 *
 * @see https://github.com/mwaylabs/cordova-plugin-device
 */
export interface MWaylabsDevicePlugin extends Device {
  name?: string;

  appIdentifier?: string;
  appVersionName?: string;
  appVersionCode?: string;
}

/**
 * describes the device platform, vendor, etc.
 */
export interface Information extends domain.Referenceable {
  /**
   * serial number extracted using cordova device plugin.
   *
   * This may be useful as an encryption key. Notice, the `uuid` is also part of this object. Both
   * information currently is available only if hosted on a mobile device running in a container.
   */
  serial?: string;

  /**
   * ISO code of language selected by user in system settings.
   */
  language: string;

  /**
   * information of runtime platform available in all environments meaning mobile device, browser
   * or node.
   */
  platform: {
    id: PlatformId;
    name: string;
    version: string
  };

  /**
   * information of mobile device as provided by Cordova device plugin.
   *
   * This member currently is `undefined` in browser and node environments, but this may change
   * without notice.
   */
  device?: MWaylabsDevicePlugin;
}

/**
 * resolves to Information object as soon as the device is ready.
 *
 * @internal SDK client code is required to use init() to obtain the Information.
 */
export const ready = (() => {
  // must be extracted from global scope object as otherwise we get ReferenceError in node.js
  const document: Document = global['document'];
  const window: Window = global['window'];

  return Q.Promise((resolve, reject) => {
    // resolves to document once the DOM is loaded
    try {
      if (!document || document.readyState === 'complete') {
        resolve(document);
        return;
      }

      function callback() {
        resolve(document);
        document.removeEventListener('load', callback);
        document.removeEventListener('DOMContentLoaded', callback);
      }
      document.addEventListener('DOMContentLoaded', callback, false);
      document.addEventListener('load', callback, false); // fallback
    } catch (error) {
      reject(error);
    }
  }).then(() => {
    // resolves to window once the device is ready
    return Q.Promise((resolve, reject) => {
      try {
        if (!window || !(
          'cordova' in window ||
          'PhoneGap' in window || 'phonegap' in window ||
          'forge' in window)
        ) {
          resolve(window);
          return;
        }

        // see https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready
        function callback() {
          resolve(window);
          document.removeEventListener('deviceready', callback);
        }

        document.addEventListener('deviceready', callback, false);
      } catch (error) {
        reject(error);
      }
    });
  }).then(() => {
    const navigator: Navigator = window && window.navigator;
    const userAgent = navigator && navigator.userAgent;
    const appVersion = navigator && navigator.appVersion;
    const device: Device = window && window['device'];

    const platformName = device && device.platform || userAgent || process.platform;
    const platformVersion = device && device.version || process.version || appVersion;
    let platformId: PlatformId;
    if (/Android/i.test(platformName)) {
      platformId = 'android';
    } else if (/iOS|iPhone|iPad|iPod/i.test(platformName)) {
      platformId = 'ios';
    } else if (/Windows Phone/i.test(platformName) || device &&
               /WinCE|Win32NT/i.test(platformName)) {
      // see https://github.com/apache/cordova-plugin-device regarding Windows Phone 7/8 Quirks
      diag.debug.assert(() => !/WinCE/i.test(platformName),
        'WindowsCE devices like Windows Phone 7 and below are not officially supported!');
      platformId = 'windowsphone';
    } else if (/BlackBerry/i.test(platformName)) {
      platformId = 'blackberry';
    } else if (navigator || process['browser']) {
      platformId = 'browser';
    } else if (process && require) {
      platformId = 'node';
    } else {
      diag.debug.assert(!!platformId, 'unknown platform: ' + platformName);
    }

    return <Information>{
      uuid: device && device.uuid,
      serial: device && device.serial,

      language: navigator && (navigator.language || navigator.userLanguage),

      platform: {
        id: platformId,
        name: platformName,
        version: platformVersion
      },

      device: device
    };
  });
})();

// output diagnostics to the console
ready.done((info) => {
  diag.debug.debug('device information: ', info);
});
