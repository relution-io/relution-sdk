"use strict";
/**
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvcmUvZGV2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNO0FBQ04sSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFFdkIsSUFBWSxJQUFJLFdBQU0sUUFBUSxDQUFDLENBQUE7QUF3RS9COzs7O0dBSUc7QUFDVSxhQUFLLEdBQUcsQ0FBQztJQUNwQiwyRkFBMkY7SUFDM0YsSUFBTSxRQUFRLEdBQWEsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzlDLElBQU0sTUFBTSxHQUFXLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUV4QyxJQUFJLGVBQThELENBQUM7SUFDbkUsSUFBTSxRQUFRLEdBQUc7UUFDZixRQUFRLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQy9DLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25DLENBQUMsQ0FBQztJQUNGLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07UUFDL0IsOENBQThDO1FBQzlDLElBQUksQ0FBQztZQUNILEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxVQUFVLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDcEQsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNsQixNQUFNLENBQUM7WUFDVCxDQUFDO1lBQ0QsZUFBZSxHQUFHLE9BQU8sQ0FBQztZQUMxQixRQUFRLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9ELFFBQVEsQ0FB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QUFJLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0MsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUN6QixDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzlCLFVBQVUsR0FBRyxNQUFNLENBQUM7UUFDdEIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxvQkFBb0IsR0FBRyxZQUFZLENBQUMsQ0FBQztRQUN2RSxDQUFDO1FBRUQsTUFBTSxDQUFjO1lBQ2xCLElBQUksRUFBRSxNQUFNLElBQUksTUFBTSxDQUFDLElBQUk7WUFDM0IsTUFBTSxFQUFFLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTTtZQUUvQixRQUFRLEVBQUUsU0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsSUFBSSxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7WUFFeEUsUUFBUSxFQUFFO2dCQUNSLEVBQUUsRUFBRSxVQUFVO2dCQUNkLElBQUksRUFBRSxZQUFZO2dCQUNsQixPQUFPLEVBQUUsZUFBZTthQUN6QjtZQUVELE1BQU0sRUFBRSxNQUFNO1NBQ2YsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUVMLG9DQUFvQztBQUNwQyxhQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTtJQUNkLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBjb3JlL2RldmljZS50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMDcuMDcuMjAxNlxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIGNvcmVcbiAqL1xuLyoqICovXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xuXG5pbXBvcnQgKiBhcyBkaWFnIGZyb20gJy4vZGlhZyc7XG5pbXBvcnQgKiBhcyBkb21haW4gZnJvbSAnLi9kb21haW4nO1xuXG4vKipcbiAqIHBsYXRmb3JtIElEcyBjb21wYXRpYmxlIHRvIGNvbnN0YW50cyBvZiBpb25pYy5cbiAqXG4gKiBOb3RpY2UsIGBpby5qc2AgaXMgdHJlYXRlZCBhcyBgbm9kZWAgaGVyZS4gWW91IG1heSBjaG9vc2UgdG8gdXNlIGBwcm9jZXNzLnBsYXRmb3JtYCB0byBmdXJ0aGVyXG4gKiBkaWZmZXJlbnRpYXRlIG9uIGRlc2t0b3BzIG9yIGB3aW5kb3cuZGV2aWNlLnBsYXRmb3JtYCBvbiBtb2JpbGUgZGV2aWNlcy4gQm90aCBvZiB0aGlzIGlzIGV4cG9zZWRcbiAqIGFzIGBJbmZvcm1hdGlvbi5wbGF0Zm9ybS5uYW1lYC4gVGhhdCBzYWlkLCB5b3Ugc2hvdWxkIGF2b2lkIHBsYXRmb3JtLXNwZWNpZmljIGNvZGUgb2YgdGhhdCBsZXZlbFxuICogZW50aXJlbHkuXG4gKi9cbmV4cG9ydCB0eXBlIFBsYXRmb3JtSWQgPVxuICAvLyBjYW4gbm90IHVzZSBjb25zdGFudHMgaGVyZSwgVHlwZVNjcmlwdCBkb2VzIG5vdCBhbGxvdyB0aGlzIGN1cnJlbnRseVxuICAnYW5kcm9pZCcgfFxuICAnaW9zJyB8XG4gICd3aW5kb3dzcGhvbmUnIHxcbiAgJ2JsYWNrYmVycnknIHxcbiAgJ2Jyb3dzZXInIHxcbiAgJ25vZGUnO1xuXG4vKipcbiAqIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gcHJvdmlkZWQgYnkgZm9ya2VkIGRldmljZSBwbHVnaW4gb2YgTS1XYXkgTGFicy5cbiAqXG4gKiBOb3RpY2UsIGFsbCBhZGRpdGlvbmFsIHByb3BlcnRpZXMgYXJlIG9wdGlvbmFsIGFzIGl0IGNhbiBub3QgYmUgZ3VhcmFudGVlZCB0aGF0IHRoZSBkZXZpY2VcbiAqIHBsdWdpbiBpcyB0aGUgbW9kaWZpZWQgdmVyc2lvbi5cbiAqXG4gKiBAc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9td2F5bGFicy9jb3Jkb3ZhLXBsdWdpbi1kZXZpY2VcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNV2F5bGFic0RldmljZVBsdWdpbiBleHRlbmRzIERldmljZSB7XG4gIG5hbWU/OiBzdHJpbmc7XG5cbiAgYXBwSWRlbnRpZmllcj86IHN0cmluZztcbiAgYXBwVmVyc2lvbk5hbWU/OiBzdHJpbmc7XG4gIGFwcFZlcnNpb25Db2RlPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIGRlc2NyaWJlcyB0aGUgZGV2aWNlIHBsYXRmb3JtLCB2ZW5kb3IsIGV0Yy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbmZvcm1hdGlvbiBleHRlbmRzIGRvbWFpbi5SZWZlcmVuY2VhYmxlIHtcbiAgLyoqXG4gICAqIHNlcmlhbCBudW1iZXIgZXh0cmFjdGVkIHVzaW5nIGNvcmRvdmEgZGV2aWNlIHBsdWdpbi5cbiAgICpcbiAgICogVGhpcyBtYXkgYmUgdXNlZnVsIGFzIGFuIGVuY3J5cHRpb24ga2V5LiBOb3RpY2UsIHRoZSBgdXVpZGAgaXMgYWxzbyBwYXJ0IG9mIHRoaXMgb2JqZWN0LiBCb3RoXG4gICAqIGluZm9ybWF0aW9uIGN1cnJlbnRseSBpcyBhdmFpbGFibGUgb25seSBpZiBob3N0ZWQgb24gYSBtb2JpbGUgZGV2aWNlIHJ1bm5pbmcgaW4gYSBjb250YWluZXIuXG4gICAqL1xuICBzZXJpYWw/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIElTTyBjb2RlIG9mIGxhbmd1YWdlIHNlbGVjdGVkIGJ5IHVzZXIgaW4gc3lzdGVtIHNldHRpbmdzLlxuICAgKi9cbiAgbGFuZ3VhZ2U6IHN0cmluZztcblxuICAvKipcbiAgICogaW5mb3JtYXRpb24gb2YgcnVudGltZSBwbGF0Zm9ybSBhdmFpbGFibGUgaW4gYWxsIGVudmlyb25tZW50cyBtZWFuaW5nIG1vYmlsZSBkZXZpY2UsIGJyb3dzZXJcbiAgICogb3Igbm9kZS5cbiAgICovXG4gIHBsYXRmb3JtOiB7XG4gICAgaWQ6IFBsYXRmb3JtSWQ7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIHZlcnNpb246IHN0cmluZ1xuICB9O1xuXG4gIC8qKlxuICAgKiBpbmZvcm1hdGlvbiBvZiBtb2JpbGUgZGV2aWNlIGFzIHByb3ZpZGVkIGJ5IENvcmRvdmEgZGV2aWNlIHBsdWdpbi5cbiAgICpcbiAgICogVGhpcyBtZW1iZXIgY3VycmVudGx5IGlzIGB1bmRlZmluZWRgIGluIGJyb3dzZXIgYW5kIG5vZGUgZW52aXJvbm1lbnRzLCBidXQgdGhpcyBtYXkgY2hhbmdlXG4gICAqIHdpdGhvdXQgbm90aWNlLlxuICAgKi9cbiAgZGV2aWNlPzogTVdheWxhYnNEZXZpY2VQbHVnaW47XG59XG5cbi8qKlxuICogcmVzb2x2ZXMgdG8gSW5mb3JtYXRpb24gb2JqZWN0IGFzIHNvb24gYXMgdGhlIGRldmljZSBpcyByZWFkeS5cbiAqXG4gKiBAaW50ZXJuYWwgU0RLIGNsaWVudCBjb2RlIGlzIHJlcXVpcmVkIHRvIHVzZSBpbml0KCkgdG8gb2J0YWluIHRoZSBJbmZvcm1hdGlvbi5cbiAqL1xuZXhwb3J0IGNvbnN0IHJlYWR5ID0gKCgpID0+IHtcbiAgLy8gbXVzdCBiZSBleHRyYWN0ZWQgZnJvbSBnbG9iYWwgc2NvcGUgb2JqZWN0IGFzIG90aGVyd2lzZSB3ZSBnZXQgUmVmZXJlbmNlRXJyb3IgaW4gbm9kZS5qc1xuICBjb25zdCBkb2N1bWVudDogRG9jdW1lbnQgPSBnbG9iYWxbJ2RvY3VtZW50J107XG4gIGNvbnN0IHdpbmRvdzogV2luZG93ID0gZ2xvYmFsWyd3aW5kb3cnXTtcblxuICBsZXQgcmVzb2x2ZURvY3VtZW50OiAodmFsOiBEb2N1bWVudCB8IFEuUHJvbWlzZTxEb2N1bWVudD4pID0+IHZvaWQ7XG4gIGNvbnN0IGNhbGxiYWNrID0gKCkgPT4ge1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBjYWxsYmFjayk7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGNhbGxiYWNrKTtcbiAgICByZXR1cm4gcmVzb2x2ZURvY3VtZW50KGRvY3VtZW50KTtcbiAgfTtcbiAgcmV0dXJuIFEuUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgLy8gcmVzb2x2ZXMgdG8gZG9jdW1lbnQgb25jZSB0aGUgRE9NIGlzIGxvYWRlZFxuICAgIHRyeSB7XG4gICAgICBpZiAoIWRvY3VtZW50IHx8IGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdjb21wbGV0ZScpIHtcbiAgICAgICAgcmVzb2x2ZShkb2N1bWVudCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHJlc29sdmVEb2N1bWVudCA9IHJlc29sdmU7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgY2FsbGJhY2ssIGZhbHNlKTtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBjYWxsYmFjaywgZmFsc2UpOyAvLyBmYWxsYmFja1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZWplY3QoZXJyb3IpO1xuICAgIH1cbiAgfSkudGhlbigoKSA9PiB7XG4gICAgLy8gcmVzb2x2ZXMgdG8gd2luZG93IG9uY2UgdGhlIGRldmljZSBpcyByZWFkeVxuICAgIHJldHVybiBRLlByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKCF3aW5kb3cgfHwgIShcbiAgICAgICAgICAnY29yZG92YScgaW4gd2luZG93IHx8XG4gICAgICAgICAgJ1Bob25lR2FwJyBpbiB3aW5kb3cgfHwgJ3Bob25lZ2FwJyBpbiB3aW5kb3cgfHxcbiAgICAgICAgICAnZm9yZ2UnIGluIHdpbmRvdylcbiAgICAgICAgKSB7XG4gICAgICAgICAgcmVzb2x2ZSh3aW5kb3cpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBzZWUgaHR0cHM6Ly9jb3Jkb3ZhLmFwYWNoZS5vcmcvZG9jcy9lbi9sYXRlc3QvY29yZG92YS9ldmVudHMvZXZlbnRzLmh0bWwjZGV2aWNlcmVhZHlcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlcmVhZHknLCAoKSA9PiB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdkZXZpY2VyZWFkeScsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIHJlc29sdmUod2luZG93KTtcbiAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSkudGhlbigoKSA9PiB7XG4gICAgY29uc3QgbmF2aWdhdG9yOiBOYXZpZ2F0b3IgPSB3aW5kb3cgJiYgd2luZG93Lm5hdmlnYXRvcjtcbiAgICBjb25zdCB1c2VyQWdlbnQgPSBuYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudDtcbiAgICBjb25zdCBhcHBWZXJzaW9uID0gbmF2aWdhdG9yICYmIG5hdmlnYXRvci5hcHBWZXJzaW9uO1xuICAgIGNvbnN0IGRldmljZTogRGV2aWNlID0gd2luZG93ICYmIHdpbmRvd1snZGV2aWNlJ107XG5cbiAgICBjb25zdCBwbGF0Zm9ybU5hbWUgPSBkZXZpY2UgJiYgZGV2aWNlLnBsYXRmb3JtIHx8IHVzZXJBZ2VudCB8fCBwcm9jZXNzLnBsYXRmb3JtO1xuICAgIGNvbnN0IHBsYXRmb3JtVmVyc2lvbiA9IGRldmljZSAmJiBkZXZpY2UudmVyc2lvbiB8fCBwcm9jZXNzLnZlcnNpb24gfHwgYXBwVmVyc2lvbjtcbiAgICBsZXQgcGxhdGZvcm1JZDogUGxhdGZvcm1JZDtcbiAgICBpZiAoL0FuZHJvaWQvaS50ZXN0KHBsYXRmb3JtTmFtZSkpIHtcbiAgICAgIHBsYXRmb3JtSWQgPSAnYW5kcm9pZCc7XG4gICAgfSBlbHNlIGlmICgvaU9TfGlQaG9uZXxpUGFkfGlQb2QvaS50ZXN0KHBsYXRmb3JtTmFtZSkpIHtcbiAgICAgIHBsYXRmb3JtSWQgPSAnaW9zJztcbiAgICB9IGVsc2UgaWYgKC9XaW5kb3dzIFBob25lL2kudGVzdChwbGF0Zm9ybU5hbWUpIHx8IGRldmljZSAmJlxuICAgICAgICAgICAgICAgL1dpbkNFfFdpbjMyTlQvaS50ZXN0KHBsYXRmb3JtTmFtZSkpIHtcbiAgICAgIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vYXBhY2hlL2NvcmRvdmEtcGx1Z2luLWRldmljZSByZWdhcmRpbmcgV2luZG93cyBQaG9uZSA3LzggUXVpcmtzXG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhL1dpbkNFL2kudGVzdChwbGF0Zm9ybU5hbWUpLFxuICAgICAgICAnV2luZG93c0NFIGRldmljZXMgbGlrZSBXaW5kb3dzIFBob25lIDcgYW5kIGJlbG93IGFyZSBub3Qgb2ZmaWNpYWxseSBzdXBwb3J0ZWQhJyk7XG4gICAgICBwbGF0Zm9ybUlkID0gJ3dpbmRvd3NwaG9uZSc7XG4gICAgfSBlbHNlIGlmICgvQmxhY2tCZXJyeS9pLnRlc3QocGxhdGZvcm1OYW1lKSkge1xuICAgICAgcGxhdGZvcm1JZCA9ICdibGFja2JlcnJ5JztcbiAgICB9IGVsc2UgaWYgKG5hdmlnYXRvciB8fCBwcm9jZXNzWydicm93c2VyJ10pIHtcbiAgICAgIHBsYXRmb3JtSWQgPSAnYnJvd3Nlcic7XG4gICAgfSBlbHNlIGlmIChwcm9jZXNzICYmIHJlcXVpcmUpIHtcbiAgICAgIHBsYXRmb3JtSWQgPSAnbm9kZSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCEhcGxhdGZvcm1JZCwgJ3Vua25vd24gcGxhdGZvcm06ICcgKyBwbGF0Zm9ybU5hbWUpO1xuICAgIH1cblxuICAgIHJldHVybiA8SW5mb3JtYXRpb24+e1xuICAgICAgdXVpZDogZGV2aWNlICYmIGRldmljZS51dWlkLFxuICAgICAgc2VyaWFsOiBkZXZpY2UgJiYgZGV2aWNlLnNlcmlhbCxcblxuICAgICAgbGFuZ3VhZ2U6IG5hdmlnYXRvciAmJiAobmF2aWdhdG9yLmxhbmd1YWdlIHx8IG5hdmlnYXRvclsndXNlckxhbmd1YWdlJ10pLFxuXG4gICAgICBwbGF0Zm9ybToge1xuICAgICAgICBpZDogcGxhdGZvcm1JZCxcbiAgICAgICAgbmFtZTogcGxhdGZvcm1OYW1lLFxuICAgICAgICB2ZXJzaW9uOiBwbGF0Zm9ybVZlcnNpb25cbiAgICAgIH0sXG5cbiAgICAgIGRldmljZTogZGV2aWNlXG4gICAgfTtcbiAgfSk7XG59KSgpO1xuXG4vLyBvdXRwdXQgZGlhZ25vc3RpY3MgdG8gdGhlIGNvbnNvbGVcbnJlYWR5LmRvbmUoKGluZm8pID0+IHtcbiAgZGlhZy5kZWJ1Zy5kZWJ1ZygnZGV2aWNlIGluZm9ybWF0aW9uOiAnLCBpbmZvKTtcbn0pO1xuIl19