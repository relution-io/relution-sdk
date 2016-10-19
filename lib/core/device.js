"use strict";
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
var Q = require('q');
var diag = require('./diag');
/**
 * resolves to Information object as soon as the device is ready.
 *
 * @internal SDK client code is required to use init() to obtain the Information.
 */
exports.ready = (function () {
    // must be extracted from global scope object as otherwise we get ReferenceError in node.js
    var document = global['document'];
    var window = global['window'];
    var resolveDocument;
    var callback = function () {
        document.removeEventListener('load', callback);
        document.removeEventListener('DOMContentLoaded', callback);
        return resolveDocument(document);
    };
    return Q.Promise(function (resolve, reject) {
        // resolves to document once the DOM is loaded
        try {
            if (!document || document.readyState === 'complete') {
                resolve(document);
                return;
            }
            resolveDocument = resolve;
            document.addEventListener('DOMContentLoaded', callback, false);
            document.addEventListener('load', callback, false); // fallback
        }
        catch (error) {
            reject(error);
        }
    }).then(function () {
        // resolves to window once the device is ready
        return Q.Promise(function (resolve, reject) {
            try {
                if (!window || !('cordova' in window ||
                    'PhoneGap' in window || 'phonegap' in window ||
                    'forge' in window)) {
                    resolve(window);
                    return;
                }
                // see https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready
                document.addEventListener('deviceready', function () {
                    document.removeEventListener('deviceready', callback);
                    resolve(window);
                }, false);
            }
            catch (error) {
                reject(error);
            }
        });
    }).then(function () {
        var navigator = window && window.navigator;
        var userAgent = navigator && navigator.userAgent;
        var appVersion = navigator && navigator.appVersion;
        var device = window && window['device'];
        var platformName = device && device.platform || userAgent || process.platform;
        var platformVersion = device && device.version || process.version || appVersion;
        var platformId;
        if (/Android/i.test(platformName)) {
            platformId = 'android';
        }
        else if (/iOS|iPhone|iPad|iPod/i.test(platformName)) {
            platformId = 'ios';
        }
        else if (/Windows Phone/i.test(platformName) || device &&
            /WinCE|Win32NT/i.test(platformName)) {
            // see https://github.com/apache/cordova-plugin-device regarding Windows Phone 7/8 Quirks
            diag.debug.assert(function () { return !/WinCE/i.test(platformName); }, 'WindowsCE devices like Windows Phone 7 and below are not officially supported!');
            platformId = 'windowsphone';
        }
        else if (/BlackBerry/i.test(platformName)) {
            platformId = 'blackberry';
        }
        else if (navigator || process['browser']) {
            platformId = 'browser';
        }
        else if (process && require) {
            platformId = 'node';
        }
        else {
            diag.debug.assert(!!platformId, 'unknown platform: ' + platformName);
        }
        return {
            uuid: device && device.uuid,
            serial: device && device.serial,
            language: navigator && (navigator.language || navigator['userLanguage']),
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
exports.ready.done(function (info) {
    diag.debug.debug('device information: ', info);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvcmUvZGV2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNO0FBQ04sSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFFdkIsSUFBWSxJQUFJLFdBQU0sUUFBUSxDQUFDLENBQUE7QUF3RS9COzs7O0dBSUc7QUFDVSxhQUFLLEdBQUcsQ0FBQztJQUNwQiwyRkFBMkY7SUFDM0YsSUFBTSxRQUFRLEdBQWEsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzlDLElBQU0sTUFBTSxHQUFXLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUV4QyxJQUFJLGVBQThELENBQUM7SUFDbkUsSUFBTSxRQUFRLEdBQUc7UUFDZixRQUFRLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQy9DLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25DLENBQUMsQ0FBQztJQUNGLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07UUFDL0IsOENBQThDO1FBQzlDLElBQUksQ0FBQztZQUNILEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxVQUFVLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDcEQsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNsQixNQUFNLENBQUM7WUFDVCxDQUFDO1lBQ0QsZUFBZSxHQUFHLE9BQU8sQ0FBQztZQUMxQixRQUFRLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9ELFFBQVEsQ0FB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QUFJLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0MsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUN6QixDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzlCLFVBQVUsR0FBRyxNQUFNLENBQUM7UUFDdEIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxvQkFBb0IsR0FBRyxZQUFZLENBQUMsQ0FBQztRQUN2RSxDQUFDO1FBRUQsTUFBTSxDQUFjO1lBQ2xCLElBQUksRUFBRSxNQUFNLElBQUksTUFBTSxDQUFDLElBQUk7WUFDM0IsTUFBTSxFQUFFLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTTtZQUUvQixRQUFRLEVBQUUsU0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsSUFBSSxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7WUFFeEUsUUFBUSxFQUFFO2dCQUNSLEVBQUUsRUFBRSxVQUFVO2dCQUNkLElBQUksRUFBRSxZQUFZO2dCQUNsQixPQUFPLEVBQUUsZUFBZTthQUN6QjtZQUVELE1BQU0sRUFBRSxNQUFNO1NBQ2YsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUVMLG9DQUFvQztBQUNwQyxhQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTtJQUNkLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogQGZpbGUgY29yZS9kZXZpY2UudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDA3LjA3LjIwMTZcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIGNvcmVcclxuICovXHJcbi8qKiAqL1xyXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xyXG5cclxuaW1wb3J0ICogYXMgZGlhZyBmcm9tICcuL2RpYWcnO1xyXG5pbXBvcnQgKiBhcyBkb21haW4gZnJvbSAnLi9kb21haW4nO1xyXG5cclxuLyoqXHJcbiAqIHBsYXRmb3JtIElEcyBjb21wYXRpYmxlIHRvIGNvbnN0YW50cyBvZiBpb25pYy5cclxuICpcclxuICogTm90aWNlLCBgaW8uanNgIGlzIHRyZWF0ZWQgYXMgYG5vZGVgIGhlcmUuIFlvdSBtYXkgY2hvb3NlIHRvIHVzZSBgcHJvY2Vzcy5wbGF0Zm9ybWAgdG8gZnVydGhlclxyXG4gKiBkaWZmZXJlbnRpYXRlIG9uIGRlc2t0b3BzIG9yIGB3aW5kb3cuZGV2aWNlLnBsYXRmb3JtYCBvbiBtb2JpbGUgZGV2aWNlcy4gQm90aCBvZiB0aGlzIGlzIGV4cG9zZWRcclxuICogYXMgYEluZm9ybWF0aW9uLnBsYXRmb3JtLm5hbWVgLiBUaGF0IHNhaWQsIHlvdSBzaG91bGQgYXZvaWQgcGxhdGZvcm0tc3BlY2lmaWMgY29kZSBvZiB0aGF0IGxldmVsXHJcbiAqIGVudGlyZWx5LlxyXG4gKi9cclxuZXhwb3J0IHR5cGUgUGxhdGZvcm1JZCA9XHJcbiAgLy8gY2FuIG5vdCB1c2UgY29uc3RhbnRzIGhlcmUsIFR5cGVTY3JpcHQgZG9lcyBub3QgYWxsb3cgdGhpcyBjdXJyZW50bHlcclxuICAnYW5kcm9pZCcgfFxyXG4gICdpb3MnIHxcclxuICAnd2luZG93c3Bob25lJyB8XHJcbiAgJ2JsYWNrYmVycnknIHxcclxuICAnYnJvd3NlcicgfFxyXG4gICdub2RlJztcclxuXHJcbi8qKlxyXG4gKiBhZGRpdGlvbmFsIGluZm9ybWF0aW9uIHByb3ZpZGVkIGJ5IGZvcmtlZCBkZXZpY2UgcGx1Z2luIG9mIE0tV2F5IExhYnMuXHJcbiAqXHJcbiAqIE5vdGljZSwgYWxsIGFkZGl0aW9uYWwgcHJvcGVydGllcyBhcmUgb3B0aW9uYWwgYXMgaXQgY2FuIG5vdCBiZSBndWFyYW50ZWVkIHRoYXQgdGhlIGRldmljZVxyXG4gKiBwbHVnaW4gaXMgdGhlIG1vZGlmaWVkIHZlcnNpb24uXHJcbiAqXHJcbiAqIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL213YXlsYWJzL2NvcmRvdmEtcGx1Z2luLWRldmljZVxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBNV2F5bGFic0RldmljZVBsdWdpbiBleHRlbmRzIERldmljZSB7XHJcbiAgbmFtZT86IHN0cmluZztcclxuXHJcbiAgYXBwSWRlbnRpZmllcj86IHN0cmluZztcclxuICBhcHBWZXJzaW9uTmFtZT86IHN0cmluZztcclxuICBhcHBWZXJzaW9uQ29kZT86IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIGRlc2NyaWJlcyB0aGUgZGV2aWNlIHBsYXRmb3JtLCB2ZW5kb3IsIGV0Yy5cclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgSW5mb3JtYXRpb24gZXh0ZW5kcyBkb21haW4uUmVmZXJlbmNlYWJsZSB7XHJcbiAgLyoqXHJcbiAgICogc2VyaWFsIG51bWJlciBleHRyYWN0ZWQgdXNpbmcgY29yZG92YSBkZXZpY2UgcGx1Z2luLlxyXG4gICAqXHJcbiAgICogVGhpcyBtYXkgYmUgdXNlZnVsIGFzIGFuIGVuY3J5cHRpb24ga2V5LiBOb3RpY2UsIHRoZSBgdXVpZGAgaXMgYWxzbyBwYXJ0IG9mIHRoaXMgb2JqZWN0LiBCb3RoXHJcbiAgICogaW5mb3JtYXRpb24gY3VycmVudGx5IGlzIGF2YWlsYWJsZSBvbmx5IGlmIGhvc3RlZCBvbiBhIG1vYmlsZSBkZXZpY2UgcnVubmluZyBpbiBhIGNvbnRhaW5lci5cclxuICAgKi9cclxuICBzZXJpYWw/OiBzdHJpbmc7XHJcblxyXG4gIC8qKlxyXG4gICAqIElTTyBjb2RlIG9mIGxhbmd1YWdlIHNlbGVjdGVkIGJ5IHVzZXIgaW4gc3lzdGVtIHNldHRpbmdzLlxyXG4gICAqL1xyXG4gIGxhbmd1YWdlOiBzdHJpbmc7XHJcblxyXG4gIC8qKlxyXG4gICAqIGluZm9ybWF0aW9uIG9mIHJ1bnRpbWUgcGxhdGZvcm0gYXZhaWxhYmxlIGluIGFsbCBlbnZpcm9ubWVudHMgbWVhbmluZyBtb2JpbGUgZGV2aWNlLCBicm93c2VyXHJcbiAgICogb3Igbm9kZS5cclxuICAgKi9cclxuICBwbGF0Zm9ybToge1xyXG4gICAgaWQ6IFBsYXRmb3JtSWQ7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICB2ZXJzaW9uOiBzdHJpbmdcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBpbmZvcm1hdGlvbiBvZiBtb2JpbGUgZGV2aWNlIGFzIHByb3ZpZGVkIGJ5IENvcmRvdmEgZGV2aWNlIHBsdWdpbi5cclxuICAgKlxyXG4gICAqIFRoaXMgbWVtYmVyIGN1cnJlbnRseSBpcyBgdW5kZWZpbmVkYCBpbiBicm93c2VyIGFuZCBub2RlIGVudmlyb25tZW50cywgYnV0IHRoaXMgbWF5IGNoYW5nZVxyXG4gICAqIHdpdGhvdXQgbm90aWNlLlxyXG4gICAqL1xyXG4gIGRldmljZT86IE1XYXlsYWJzRGV2aWNlUGx1Z2luO1xyXG59XHJcblxyXG4vKipcclxuICogcmVzb2x2ZXMgdG8gSW5mb3JtYXRpb24gb2JqZWN0IGFzIHNvb24gYXMgdGhlIGRldmljZSBpcyByZWFkeS5cclxuICpcclxuICogQGludGVybmFsIFNESyBjbGllbnQgY29kZSBpcyByZXF1aXJlZCB0byB1c2UgaW5pdCgpIHRvIG9idGFpbiB0aGUgSW5mb3JtYXRpb24uXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgcmVhZHkgPSAoKCkgPT4ge1xyXG4gIC8vIG11c3QgYmUgZXh0cmFjdGVkIGZyb20gZ2xvYmFsIHNjb3BlIG9iamVjdCBhcyBvdGhlcndpc2Ugd2UgZ2V0IFJlZmVyZW5jZUVycm9yIGluIG5vZGUuanNcclxuICBjb25zdCBkb2N1bWVudDogRG9jdW1lbnQgPSBnbG9iYWxbJ2RvY3VtZW50J107XHJcbiAgY29uc3Qgd2luZG93OiBXaW5kb3cgPSBnbG9iYWxbJ3dpbmRvdyddO1xyXG5cclxuICBsZXQgcmVzb2x2ZURvY3VtZW50OiAodmFsOiBEb2N1bWVudCB8IFEuUHJvbWlzZTxEb2N1bWVudD4pID0+IHZvaWQ7XHJcbiAgY29uc3QgY2FsbGJhY2sgPSAoKSA9PiB7XHJcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkJywgY2FsbGJhY2spO1xyXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGNhbGxiYWNrKTtcclxuICAgIHJldHVybiByZXNvbHZlRG9jdW1lbnQoZG9jdW1lbnQpO1xyXG4gIH07XHJcbiAgcmV0dXJuIFEuUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAvLyByZXNvbHZlcyB0byBkb2N1bWVudCBvbmNlIHRoZSBET00gaXMgbG9hZGVkXHJcbiAgICB0cnkge1xyXG4gICAgICBpZiAoIWRvY3VtZW50IHx8IGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdjb21wbGV0ZScpIHtcclxuICAgICAgICByZXNvbHZlKGRvY3VtZW50KTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgcmVzb2x2ZURvY3VtZW50ID0gcmVzb2x2ZTtcclxuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGNhbGxiYWNrLCBmYWxzZSk7XHJcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBjYWxsYmFjaywgZmFsc2UpOyAvLyBmYWxsYmFja1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgIH1cclxuICB9KS50aGVuKCgpID0+IHtcclxuICAgIC8vIHJlc29sdmVzIHRvIHdpbmRvdyBvbmNlIHRoZSBkZXZpY2UgaXMgcmVhZHlcclxuICAgIHJldHVybiBRLlByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGlmICghd2luZG93IHx8ICEoXHJcbiAgICAgICAgICAnY29yZG92YScgaW4gd2luZG93IHx8XHJcbiAgICAgICAgICAnUGhvbmVHYXAnIGluIHdpbmRvdyB8fCAncGhvbmVnYXAnIGluIHdpbmRvdyB8fFxyXG4gICAgICAgICAgJ2ZvcmdlJyBpbiB3aW5kb3cpXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICByZXNvbHZlKHdpbmRvdyk7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHNlZSBodHRwczovL2NvcmRvdmEuYXBhY2hlLm9yZy9kb2NzL2VuL2xhdGVzdC9jb3Jkb3ZhL2V2ZW50cy9ldmVudHMuaHRtbCNkZXZpY2VyZWFkeVxyXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZXJlYWR5JywgKCkgPT4ge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdkZXZpY2VyZWFkeScsIGNhbGxiYWNrKTtcclxuICAgICAgICAgICAgcmVzb2x2ZSh3aW5kb3cpO1xyXG4gICAgICAgIH0sIGZhbHNlKTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9KS50aGVuKCgpID0+IHtcclxuICAgIGNvbnN0IG5hdmlnYXRvcjogTmF2aWdhdG9yID0gd2luZG93ICYmIHdpbmRvdy5uYXZpZ2F0b3I7XHJcbiAgICBjb25zdCB1c2VyQWdlbnQgPSBuYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudDtcclxuICAgIGNvbnN0IGFwcFZlcnNpb24gPSBuYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLmFwcFZlcnNpb247XHJcbiAgICBjb25zdCBkZXZpY2U6IERldmljZSA9IHdpbmRvdyAmJiB3aW5kb3dbJ2RldmljZSddO1xyXG5cclxuICAgIGNvbnN0IHBsYXRmb3JtTmFtZSA9IGRldmljZSAmJiBkZXZpY2UucGxhdGZvcm0gfHwgdXNlckFnZW50IHx8IHByb2Nlc3MucGxhdGZvcm07XHJcbiAgICBjb25zdCBwbGF0Zm9ybVZlcnNpb24gPSBkZXZpY2UgJiYgZGV2aWNlLnZlcnNpb24gfHwgcHJvY2Vzcy52ZXJzaW9uIHx8IGFwcFZlcnNpb247XHJcbiAgICBsZXQgcGxhdGZvcm1JZDogUGxhdGZvcm1JZDtcclxuICAgIGlmICgvQW5kcm9pZC9pLnRlc3QocGxhdGZvcm1OYW1lKSkge1xyXG4gICAgICBwbGF0Zm9ybUlkID0gJ2FuZHJvaWQnO1xyXG4gICAgfSBlbHNlIGlmICgvaU9TfGlQaG9uZXxpUGFkfGlQb2QvaS50ZXN0KHBsYXRmb3JtTmFtZSkpIHtcclxuICAgICAgcGxhdGZvcm1JZCA9ICdpb3MnO1xyXG4gICAgfSBlbHNlIGlmICgvV2luZG93cyBQaG9uZS9pLnRlc3QocGxhdGZvcm1OYW1lKSB8fCBkZXZpY2UgJiZcclxuICAgICAgICAgICAgICAgL1dpbkNFfFdpbjMyTlQvaS50ZXN0KHBsYXRmb3JtTmFtZSkpIHtcclxuICAgICAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hcGFjaGUvY29yZG92YS1wbHVnaW4tZGV2aWNlIHJlZ2FyZGluZyBXaW5kb3dzIFBob25lIDcvOCBRdWlya3NcclxuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIS9XaW5DRS9pLnRlc3QocGxhdGZvcm1OYW1lKSxcclxuICAgICAgICAnV2luZG93c0NFIGRldmljZXMgbGlrZSBXaW5kb3dzIFBob25lIDcgYW5kIGJlbG93IGFyZSBub3Qgb2ZmaWNpYWxseSBzdXBwb3J0ZWQhJyk7XHJcbiAgICAgIHBsYXRmb3JtSWQgPSAnd2luZG93c3Bob25lJztcclxuICAgIH0gZWxzZSBpZiAoL0JsYWNrQmVycnkvaS50ZXN0KHBsYXRmb3JtTmFtZSkpIHtcclxuICAgICAgcGxhdGZvcm1JZCA9ICdibGFja2JlcnJ5JztcclxuICAgIH0gZWxzZSBpZiAobmF2aWdhdG9yIHx8IHByb2Nlc3NbJ2Jyb3dzZXInXSkge1xyXG4gICAgICBwbGF0Zm9ybUlkID0gJ2Jyb3dzZXInO1xyXG4gICAgfSBlbHNlIGlmIChwcm9jZXNzICYmIHJlcXVpcmUpIHtcclxuICAgICAgcGxhdGZvcm1JZCA9ICdub2RlJztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCEhcGxhdGZvcm1JZCwgJ3Vua25vd24gcGxhdGZvcm06ICcgKyBwbGF0Zm9ybU5hbWUpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiA8SW5mb3JtYXRpb24+e1xyXG4gICAgICB1dWlkOiBkZXZpY2UgJiYgZGV2aWNlLnV1aWQsXHJcbiAgICAgIHNlcmlhbDogZGV2aWNlICYmIGRldmljZS5zZXJpYWwsXHJcblxyXG4gICAgICBsYW5ndWFnZTogbmF2aWdhdG9yICYmIChuYXZpZ2F0b3IubGFuZ3VhZ2UgfHwgbmF2aWdhdG9yWyd1c2VyTGFuZ3VhZ2UnXSksXHJcblxyXG4gICAgICBwbGF0Zm9ybToge1xyXG4gICAgICAgIGlkOiBwbGF0Zm9ybUlkLFxyXG4gICAgICAgIG5hbWU6IHBsYXRmb3JtTmFtZSxcclxuICAgICAgICB2ZXJzaW9uOiBwbGF0Zm9ybVZlcnNpb25cclxuICAgICAgfSxcclxuXHJcbiAgICAgIGRldmljZTogZGV2aWNlXHJcbiAgICB9O1xyXG4gIH0pO1xyXG59KSgpO1xyXG5cclxuLy8gb3V0cHV0IGRpYWdub3N0aWNzIHRvIHRoZSBjb25zb2xlXHJcbnJlYWR5LmRvbmUoKGluZm8pID0+IHtcclxuICBkaWFnLmRlYnVnLmRlYnVnKCdkZXZpY2UgaW5mb3JtYXRpb246ICcsIGluZm8pO1xyXG59KTtcclxuIl19