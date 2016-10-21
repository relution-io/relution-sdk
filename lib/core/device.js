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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvcmUvZGV2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNO0FBQ04sSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFFdkIsSUFBWSxJQUFJLFdBQU0sUUFBUSxDQUFDLENBQUE7QUF3RS9COzs7O0dBSUc7QUFDVSxhQUFLLEdBQUcsQ0FBQztJQUNwQiwyRkFBMkY7SUFDM0YsSUFBTSxRQUFRLEdBQWEsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzlDLElBQU0sTUFBTSxHQUFXLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUV4QyxJQUFJLGVBQThELENBQUM7SUFDbkUsSUFBTSxRQUFRLEdBQUc7UUFDZixRQUFRLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQy9DLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25DLENBQUMsQ0FBQztJQUNGLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07UUFDL0IsOENBQThDO1FBQzlDLElBQUksQ0FBQztZQUNILEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxVQUFVLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDcEQsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNsQixNQUFNLENBQUM7WUFDVCxDQUFDO1lBQ0QsZUFBZSxHQUFHLE9BQU8sQ0FBQztZQUMxQixRQUFRLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9ELFFBQVEsQ0FB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QUFJLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0MsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUN6QixDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzlCLFVBQVUsR0FBRyxNQUFNLENBQUM7UUFDdEIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxvQkFBb0IsR0FBRyxZQUFZLENBQUMsQ0FBQztRQUN2RSxDQUFDO1FBRUQsTUFBTSxDQUFjO1lBQ2xCLElBQUksRUFBRSxNQUFNLElBQUksTUFBTSxDQUFDLElBQUk7WUFDM0IsTUFBTSxFQUFFLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTTtZQUUvQixRQUFRLEVBQUUsU0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsSUFBSSxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7WUFFeEUsUUFBUSxFQUFFO2dCQUNSLEVBQUUsRUFBRSxVQUFVO2dCQUNkLElBQUksRUFBRSxZQUFZO2dCQUNsQixPQUFPLEVBQUUsZUFBZTthQUN6QjtZQUVELE1BQU0sRUFBRSxNQUFNO1NBQ2YsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUVMLG9DQUFvQztBQUNwQyxhQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTtJQUNkLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIGNvcmUvZGV2aWNlLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAwNy4wNy4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgY29yZVxuICovXG4vKiogKi9cbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XG5cbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi9kaWFnJztcbmltcG9ydCAqIGFzIGRvbWFpbiBmcm9tICcuL2RvbWFpbic7XG5cbi8qKlxuICogcGxhdGZvcm0gSURzIGNvbXBhdGlibGUgdG8gY29uc3RhbnRzIG9mIGlvbmljLlxuICpcbiAqIE5vdGljZSwgYGlvLmpzYCBpcyB0cmVhdGVkIGFzIGBub2RlYCBoZXJlLiBZb3UgbWF5IGNob29zZSB0byB1c2UgYHByb2Nlc3MucGxhdGZvcm1gIHRvIGZ1cnRoZXJcbiAqIGRpZmZlcmVudGlhdGUgb24gZGVza3RvcHMgb3IgYHdpbmRvdy5kZXZpY2UucGxhdGZvcm1gIG9uIG1vYmlsZSBkZXZpY2VzLiBCb3RoIG9mIHRoaXMgaXMgZXhwb3NlZFxuICogYXMgYEluZm9ybWF0aW9uLnBsYXRmb3JtLm5hbWVgLiBUaGF0IHNhaWQsIHlvdSBzaG91bGQgYXZvaWQgcGxhdGZvcm0tc3BlY2lmaWMgY29kZSBvZiB0aGF0IGxldmVsXG4gKiBlbnRpcmVseS5cbiAqL1xuZXhwb3J0IHR5cGUgUGxhdGZvcm1JZCA9XG4gIC8vIGNhbiBub3QgdXNlIGNvbnN0YW50cyBoZXJlLCBUeXBlU2NyaXB0IGRvZXMgbm90IGFsbG93IHRoaXMgY3VycmVudGx5XG4gICdhbmRyb2lkJyB8XG4gICdpb3MnIHxcbiAgJ3dpbmRvd3NwaG9uZScgfFxuICAnYmxhY2tiZXJyeScgfFxuICAnYnJvd3NlcicgfFxuICAnbm9kZSc7XG5cbi8qKlxuICogYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBwcm92aWRlZCBieSBmb3JrZWQgZGV2aWNlIHBsdWdpbiBvZiBNLVdheSBMYWJzLlxuICpcbiAqIE5vdGljZSwgYWxsIGFkZGl0aW9uYWwgcHJvcGVydGllcyBhcmUgb3B0aW9uYWwgYXMgaXQgY2FuIG5vdCBiZSBndWFyYW50ZWVkIHRoYXQgdGhlIGRldmljZVxuICogcGx1Z2luIGlzIHRoZSBtb2RpZmllZCB2ZXJzaW9uLlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL213YXlsYWJzL2NvcmRvdmEtcGx1Z2luLWRldmljZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1XYXlsYWJzRGV2aWNlUGx1Z2luIGV4dGVuZHMgRGV2aWNlIHtcbiAgbmFtZT86IHN0cmluZztcblxuICBhcHBJZGVudGlmaWVyPzogc3RyaW5nO1xuICBhcHBWZXJzaW9uTmFtZT86IHN0cmluZztcbiAgYXBwVmVyc2lvbkNvZGU/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogZGVzY3JpYmVzIHRoZSBkZXZpY2UgcGxhdGZvcm0sIHZlbmRvciwgZXRjLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEluZm9ybWF0aW9uIGV4dGVuZHMgZG9tYWluLlJlZmVyZW5jZWFibGUge1xuICAvKipcbiAgICogc2VyaWFsIG51bWJlciBleHRyYWN0ZWQgdXNpbmcgY29yZG92YSBkZXZpY2UgcGx1Z2luLlxuICAgKlxuICAgKiBUaGlzIG1heSBiZSB1c2VmdWwgYXMgYW4gZW5jcnlwdGlvbiBrZXkuIE5vdGljZSwgdGhlIGB1dWlkYCBpcyBhbHNvIHBhcnQgb2YgdGhpcyBvYmplY3QuIEJvdGhcbiAgICogaW5mb3JtYXRpb24gY3VycmVudGx5IGlzIGF2YWlsYWJsZSBvbmx5IGlmIGhvc3RlZCBvbiBhIG1vYmlsZSBkZXZpY2UgcnVubmluZyBpbiBhIGNvbnRhaW5lci5cbiAgICovXG4gIHNlcmlhbD86IHN0cmluZztcblxuICAvKipcbiAgICogSVNPIGNvZGUgb2YgbGFuZ3VhZ2Ugc2VsZWN0ZWQgYnkgdXNlciBpbiBzeXN0ZW0gc2V0dGluZ3MuXG4gICAqL1xuICBsYW5ndWFnZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBpbmZvcm1hdGlvbiBvZiBydW50aW1lIHBsYXRmb3JtIGF2YWlsYWJsZSBpbiBhbGwgZW52aXJvbm1lbnRzIG1lYW5pbmcgbW9iaWxlIGRldmljZSwgYnJvd3NlclxuICAgKiBvciBub2RlLlxuICAgKi9cbiAgcGxhdGZvcm06IHtcbiAgICBpZDogUGxhdGZvcm1JZDtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgdmVyc2lvbjogc3RyaW5nXG4gIH07XG5cbiAgLyoqXG4gICAqIGluZm9ybWF0aW9uIG9mIG1vYmlsZSBkZXZpY2UgYXMgcHJvdmlkZWQgYnkgQ29yZG92YSBkZXZpY2UgcGx1Z2luLlxuICAgKlxuICAgKiBUaGlzIG1lbWJlciBjdXJyZW50bHkgaXMgYHVuZGVmaW5lZGAgaW4gYnJvd3NlciBhbmQgbm9kZSBlbnZpcm9ubWVudHMsIGJ1dCB0aGlzIG1heSBjaGFuZ2VcbiAgICogd2l0aG91dCBub3RpY2UuXG4gICAqL1xuICBkZXZpY2U/OiBNV2F5bGFic0RldmljZVBsdWdpbjtcbn1cblxuLyoqXG4gKiByZXNvbHZlcyB0byBJbmZvcm1hdGlvbiBvYmplY3QgYXMgc29vbiBhcyB0aGUgZGV2aWNlIGlzIHJlYWR5LlxuICpcbiAqIEBpbnRlcm5hbCBTREsgY2xpZW50IGNvZGUgaXMgcmVxdWlyZWQgdG8gdXNlIGluaXQoKSB0byBvYnRhaW4gdGhlIEluZm9ybWF0aW9uLlxuICovXG5leHBvcnQgY29uc3QgcmVhZHkgPSAoKCkgPT4ge1xuICAvLyBtdXN0IGJlIGV4dHJhY3RlZCBmcm9tIGdsb2JhbCBzY29wZSBvYmplY3QgYXMgb3RoZXJ3aXNlIHdlIGdldCBSZWZlcmVuY2VFcnJvciBpbiBub2RlLmpzXG4gIGNvbnN0IGRvY3VtZW50OiBEb2N1bWVudCA9IGdsb2JhbFsnZG9jdW1lbnQnXTtcbiAgY29uc3Qgd2luZG93OiBXaW5kb3cgPSBnbG9iYWxbJ3dpbmRvdyddO1xuXG4gIGxldCByZXNvbHZlRG9jdW1lbnQ6ICh2YWw6IERvY3VtZW50IHwgUS5Qcm9taXNlPERvY3VtZW50PikgPT4gdm9pZDtcbiAgY29uc3QgY2FsbGJhY2sgPSAoKSA9PiB7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbG9hZCcsIGNhbGxiYWNrKTtcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgY2FsbGJhY2spO1xuICAgIHJldHVybiByZXNvbHZlRG9jdW1lbnQoZG9jdW1lbnQpO1xuICB9O1xuICByZXR1cm4gUS5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAvLyByZXNvbHZlcyB0byBkb2N1bWVudCBvbmNlIHRoZSBET00gaXMgbG9hZGVkXG4gICAgdHJ5IHtcbiAgICAgIGlmICghZG9jdW1lbnQgfHwgZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJykge1xuICAgICAgICByZXNvbHZlKGRvY3VtZW50KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZURvY3VtZW50ID0gcmVzb2x2ZTtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBjYWxsYmFjaywgZmFsc2UpO1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGNhbGxiYWNrLCBmYWxzZSk7IC8vIGZhbGxiYWNrXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJlamVjdChlcnJvcik7XG4gICAgfVxuICB9KS50aGVuKCgpID0+IHtcbiAgICAvLyByZXNvbHZlcyB0byB3aW5kb3cgb25jZSB0aGUgZGV2aWNlIGlzIHJlYWR5XG4gICAgcmV0dXJuIFEuUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoIXdpbmRvdyB8fCAhKFxuICAgICAgICAgICdjb3Jkb3ZhJyBpbiB3aW5kb3cgfHxcbiAgICAgICAgICAnUGhvbmVHYXAnIGluIHdpbmRvdyB8fCAncGhvbmVnYXAnIGluIHdpbmRvdyB8fFxuICAgICAgICAgICdmb3JnZScgaW4gd2luZG93KVxuICAgICAgICApIHtcbiAgICAgICAgICByZXNvbHZlKHdpbmRvdyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIHNlZSBodHRwczovL2NvcmRvdmEuYXBhY2hlLm9yZy9kb2NzL2VuL2xhdGVzdC9jb3Jkb3ZhL2V2ZW50cy9ldmVudHMuaHRtbCNkZXZpY2VyZWFkeVxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VyZWFkeScsICgpID0+IHtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2RldmljZXJlYWR5JywgY2FsbGJhY2spO1xuICAgICAgICAgICAgcmVzb2x2ZSh3aW5kb3cpO1xuICAgICAgICB9LCBmYWxzZSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KS50aGVuKCgpID0+IHtcbiAgICBjb25zdCBuYXZpZ2F0b3I6IE5hdmlnYXRvciA9IHdpbmRvdyAmJiB3aW5kb3cubmF2aWdhdG9yO1xuICAgIGNvbnN0IHVzZXJBZ2VudCA9IG5hdmlnYXRvciAmJiBuYXZpZ2F0b3IudXNlckFnZW50O1xuICAgIGNvbnN0IGFwcFZlcnNpb24gPSBuYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLmFwcFZlcnNpb247XG4gICAgY29uc3QgZGV2aWNlOiBEZXZpY2UgPSB3aW5kb3cgJiYgd2luZG93WydkZXZpY2UnXTtcblxuICAgIGNvbnN0IHBsYXRmb3JtTmFtZSA9IGRldmljZSAmJiBkZXZpY2UucGxhdGZvcm0gfHwgdXNlckFnZW50IHx8IHByb2Nlc3MucGxhdGZvcm07XG4gICAgY29uc3QgcGxhdGZvcm1WZXJzaW9uID0gZGV2aWNlICYmIGRldmljZS52ZXJzaW9uIHx8IHByb2Nlc3MudmVyc2lvbiB8fCBhcHBWZXJzaW9uO1xuICAgIGxldCBwbGF0Zm9ybUlkOiBQbGF0Zm9ybUlkO1xuICAgIGlmICgvQW5kcm9pZC9pLnRlc3QocGxhdGZvcm1OYW1lKSkge1xuICAgICAgcGxhdGZvcm1JZCA9ICdhbmRyb2lkJztcbiAgICB9IGVsc2UgaWYgKC9pT1N8aVBob25lfGlQYWR8aVBvZC9pLnRlc3QocGxhdGZvcm1OYW1lKSkge1xuICAgICAgcGxhdGZvcm1JZCA9ICdpb3MnO1xuICAgIH0gZWxzZSBpZiAoL1dpbmRvd3MgUGhvbmUvaS50ZXN0KHBsYXRmb3JtTmFtZSkgfHwgZGV2aWNlICYmXG4gICAgICAgICAgICAgICAvV2luQ0V8V2luMzJOVC9pLnRlc3QocGxhdGZvcm1OYW1lKSkge1xuICAgICAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hcGFjaGUvY29yZG92YS1wbHVnaW4tZGV2aWNlIHJlZ2FyZGluZyBXaW5kb3dzIFBob25lIDcvOCBRdWlya3NcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICEvV2luQ0UvaS50ZXN0KHBsYXRmb3JtTmFtZSksXG4gICAgICAgICdXaW5kb3dzQ0UgZGV2aWNlcyBsaWtlIFdpbmRvd3MgUGhvbmUgNyBhbmQgYmVsb3cgYXJlIG5vdCBvZmZpY2lhbGx5IHN1cHBvcnRlZCEnKTtcbiAgICAgIHBsYXRmb3JtSWQgPSAnd2luZG93c3Bob25lJztcbiAgICB9IGVsc2UgaWYgKC9CbGFja0JlcnJ5L2kudGVzdChwbGF0Zm9ybU5hbWUpKSB7XG4gICAgICBwbGF0Zm9ybUlkID0gJ2JsYWNrYmVycnknO1xuICAgIH0gZWxzZSBpZiAobmF2aWdhdG9yIHx8IHByb2Nlc3NbJ2Jyb3dzZXInXSkge1xuICAgICAgcGxhdGZvcm1JZCA9ICdicm93c2VyJztcbiAgICB9IGVsc2UgaWYgKHByb2Nlc3MgJiYgcmVxdWlyZSkge1xuICAgICAgcGxhdGZvcm1JZCA9ICdub2RlJztcbiAgICB9IGVsc2Uge1xuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoISFwbGF0Zm9ybUlkLCAndW5rbm93biBwbGF0Zm9ybTogJyArIHBsYXRmb3JtTmFtZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIDxJbmZvcm1hdGlvbj57XG4gICAgICB1dWlkOiBkZXZpY2UgJiYgZGV2aWNlLnV1aWQsXG4gICAgICBzZXJpYWw6IGRldmljZSAmJiBkZXZpY2Uuc2VyaWFsLFxuXG4gICAgICBsYW5ndWFnZTogbmF2aWdhdG9yICYmIChuYXZpZ2F0b3IubGFuZ3VhZ2UgfHwgbmF2aWdhdG9yWyd1c2VyTGFuZ3VhZ2UnXSksXG5cbiAgICAgIHBsYXRmb3JtOiB7XG4gICAgICAgIGlkOiBwbGF0Zm9ybUlkLFxuICAgICAgICBuYW1lOiBwbGF0Zm9ybU5hbWUsXG4gICAgICAgIHZlcnNpb246IHBsYXRmb3JtVmVyc2lvblxuICAgICAgfSxcblxuICAgICAgZGV2aWNlOiBkZXZpY2VcbiAgICB9O1xuICB9KTtcbn0pKCk7XG5cbi8vIG91dHB1dCBkaWFnbm9zdGljcyB0byB0aGUgY29uc29sZVxucmVhZHkuZG9uZSgoaW5mbykgPT4ge1xuICBkaWFnLmRlYnVnLmRlYnVnKCdkZXZpY2UgaW5mb3JtYXRpb246ICcsIGluZm8pO1xufSk7XG4iXX0=