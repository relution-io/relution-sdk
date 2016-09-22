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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvcmUvZGV2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNO0FBQ04sSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFFdkIsSUFBWSxJQUFJLFdBQU0sUUFBUSxDQUFDLENBQUE7QUF3RS9COzs7O0dBSUc7QUFDVSxhQUFLLEdBQUcsQ0FBQztJQUNwQiwyRkFBMkY7SUFDM0YsSUFBTSxRQUFRLEdBQWEsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzlDLElBQU0sTUFBTSxHQUFXLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUV4QyxJQUFJLGVBQThELENBQUM7SUFDbkUsSUFBTSxRQUFRLEdBQUc7UUFDZixRQUFRLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQy9DLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25DLENBQUMsQ0FBQztJQUNGLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07UUFDL0IsOENBQThDO1FBQzlDLElBQUksQ0FBQztZQUNILEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxVQUFVLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDcEQsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNsQixNQUFNLENBQUM7WUFDVCxDQUFDO1lBQ0QsZUFBZSxHQUFHLE9BQU8sQ0FBQztZQUMxQixRQUFRLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9ELFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsV0FBVztRQUNqRSxDQUFFO1FBQUEsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoQixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ04sOENBQThDO1FBQzlDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFFLE1BQU07WUFDL0IsSUFBSSxDQUFDO2dCQUNILEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FDZCxTQUFTLElBQUksTUFBTTtvQkFDbkIsVUFBVSxJQUFJLE1BQU0sSUFBSSxVQUFVLElBQUksTUFBTTtvQkFDNUMsT0FBTyxJQUFJLE1BQU0sQ0FDbkIsQ0FBQyxDQUFDLENBQUM7b0JBQ0QsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNoQixNQUFNLENBQUM7Z0JBQ1QsQ0FBQztnQkFDRCx1RkFBdUY7Z0JBQ3ZGLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUU7b0JBQ3JDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUM7b0JBQ3RELE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDcEIsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ1osQ0FBRTtZQUFBLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ2YsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hCLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNOLElBQU0sU0FBUyxHQUFjLE1BQU0sSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDO1FBQ3hELElBQU0sU0FBUyxHQUFHLFNBQVMsSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDO1FBQ25ELElBQU0sVUFBVSxHQUFHLFNBQVMsSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDO1FBQ3JELElBQU0sTUFBTSxHQUFXLE1BQU0sSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFbEQsSUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLE1BQU0sQ0FBQyxRQUFRLElBQUksU0FBUyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDaEYsSUFBTSxlQUFlLEdBQUcsTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxVQUFVLENBQUM7UUFDbEYsSUFBSSxVQUFzQixDQUFDO1FBQzNCLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLFVBQVUsR0FBRyxTQUFTLENBQUM7UUFDekIsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RELFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDckIsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksTUFBTTtZQUM3QyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9DLHlGQUF5RjtZQUN6RixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUE1QixDQUE0QixFQUNsRCxnRkFBZ0YsQ0FBQyxDQUFDO1lBQ3BGLFVBQVUsR0FBRyxjQUFjLENBQUM7UUFDOUIsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxVQUFVLEdBQUcsWUFBWSxDQUFDO1FBQzVCLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0MsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUN6QixDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzlCLFVBQVUsR0FBRyxNQUFNLENBQUM7UUFDdEIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxvQkFBb0IsR0FBRyxZQUFZLENBQUMsQ0FBQztRQUN2RSxDQUFDO1FBRUQsTUFBTSxDQUFjO1lBQ2xCLElBQUksRUFBRSxNQUFNLElBQUksTUFBTSxDQUFDLElBQUk7WUFDM0IsTUFBTSxFQUFFLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTTtZQUUvQixRQUFRLEVBQUUsU0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsSUFBSSxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7WUFFeEUsUUFBUSxFQUFFO2dCQUNSLEVBQUUsRUFBRSxVQUFVO2dCQUNkLElBQUksRUFBRSxZQUFZO2dCQUNsQixPQUFPLEVBQUUsZUFBZTthQUN6QjtZQUVELE1BQU0sRUFBRSxNQUFNO1NBQ2YsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUVMLG9DQUFvQztBQUNwQyxhQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTtJQUNkLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEBmaWxlIGNvcmUvZGV2aWNlLnRzXHJcbiAqIFJlbHV0aW9uIFNES1xyXG4gKlxyXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAwNy4wNy4yMDE2XHJcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQG1vZHVsZSBjb3JlXHJcbiAqL1xyXG4vKiogKi9cclxuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcclxuXHJcbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi9kaWFnJztcclxuaW1wb3J0ICogYXMgZG9tYWluIGZyb20gJy4vZG9tYWluJztcclxuXHJcbi8qKlxyXG4gKiBwbGF0Zm9ybSBJRHMgY29tcGF0aWJsZSB0byBjb25zdGFudHMgb2YgaW9uaWMuXHJcbiAqXHJcbiAqIE5vdGljZSwgYGlvLmpzYCBpcyB0cmVhdGVkIGFzIGBub2RlYCBoZXJlLiBZb3UgbWF5IGNob29zZSB0byB1c2UgYHByb2Nlc3MucGxhdGZvcm1gIHRvIGZ1cnRoZXJcclxuICogZGlmZmVyZW50aWF0ZSBvbiBkZXNrdG9wcyBvciBgd2luZG93LmRldmljZS5wbGF0Zm9ybWAgb24gbW9iaWxlIGRldmljZXMuIEJvdGggb2YgdGhpcyBpcyBleHBvc2VkXHJcbiAqIGFzIGBJbmZvcm1hdGlvbi5wbGF0Zm9ybS5uYW1lYC4gVGhhdCBzYWlkLCB5b3Ugc2hvdWxkIGF2b2lkIHBsYXRmb3JtLXNwZWNpZmljIGNvZGUgb2YgdGhhdCBsZXZlbFxyXG4gKiBlbnRpcmVseS5cclxuICovXHJcbmV4cG9ydCB0eXBlIFBsYXRmb3JtSWQgPVxyXG4gIC8vIGNhbiBub3QgdXNlIGNvbnN0YW50cyBoZXJlLCBUeXBlU2NyaXB0IGRvZXMgbm90IGFsbG93IHRoaXMgY3VycmVudGx5XHJcbiAgJ2FuZHJvaWQnIHxcclxuICAnaW9zJyB8XHJcbiAgJ3dpbmRvd3NwaG9uZScgfFxyXG4gICdibGFja2JlcnJ5JyB8XHJcbiAgJ2Jyb3dzZXInIHxcclxuICAnbm9kZSc7XHJcblxyXG4vKipcclxuICogYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBwcm92aWRlZCBieSBmb3JrZWQgZGV2aWNlIHBsdWdpbiBvZiBNLVdheSBMYWJzLlxyXG4gKlxyXG4gKiBOb3RpY2UsIGFsbCBhZGRpdGlvbmFsIHByb3BlcnRpZXMgYXJlIG9wdGlvbmFsIGFzIGl0IGNhbiBub3QgYmUgZ3VhcmFudGVlZCB0aGF0IHRoZSBkZXZpY2VcclxuICogcGx1Z2luIGlzIHRoZSBtb2RpZmllZCB2ZXJzaW9uLlxyXG4gKlxyXG4gKiBAc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9td2F5bGFicy9jb3Jkb3ZhLXBsdWdpbi1kZXZpY2VcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgTVdheWxhYnNEZXZpY2VQbHVnaW4gZXh0ZW5kcyBEZXZpY2Uge1xyXG4gIG5hbWU/OiBzdHJpbmc7XHJcblxyXG4gIGFwcElkZW50aWZpZXI/OiBzdHJpbmc7XHJcbiAgYXBwVmVyc2lvbk5hbWU/OiBzdHJpbmc7XHJcbiAgYXBwVmVyc2lvbkNvZGU/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBkZXNjcmliZXMgdGhlIGRldmljZSBwbGF0Zm9ybSwgdmVuZG9yLCBldGMuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEluZm9ybWF0aW9uIGV4dGVuZHMgZG9tYWluLlJlZmVyZW5jZWFibGUge1xyXG4gIC8qKlxyXG4gICAqIHNlcmlhbCBudW1iZXIgZXh0cmFjdGVkIHVzaW5nIGNvcmRvdmEgZGV2aWNlIHBsdWdpbi5cclxuICAgKlxyXG4gICAqIFRoaXMgbWF5IGJlIHVzZWZ1bCBhcyBhbiBlbmNyeXB0aW9uIGtleS4gTm90aWNlLCB0aGUgYHV1aWRgIGlzIGFsc28gcGFydCBvZiB0aGlzIG9iamVjdC4gQm90aFxyXG4gICAqIGluZm9ybWF0aW9uIGN1cnJlbnRseSBpcyBhdmFpbGFibGUgb25seSBpZiBob3N0ZWQgb24gYSBtb2JpbGUgZGV2aWNlIHJ1bm5pbmcgaW4gYSBjb250YWluZXIuXHJcbiAgICovXHJcbiAgc2VyaWFsPzogc3RyaW5nO1xyXG5cclxuICAvKipcclxuICAgKiBJU08gY29kZSBvZiBsYW5ndWFnZSBzZWxlY3RlZCBieSB1c2VyIGluIHN5c3RlbSBzZXR0aW5ncy5cclxuICAgKi9cclxuICBsYW5ndWFnZTogc3RyaW5nO1xyXG5cclxuICAvKipcclxuICAgKiBpbmZvcm1hdGlvbiBvZiBydW50aW1lIHBsYXRmb3JtIGF2YWlsYWJsZSBpbiBhbGwgZW52aXJvbm1lbnRzIG1lYW5pbmcgbW9iaWxlIGRldmljZSwgYnJvd3NlclxyXG4gICAqIG9yIG5vZGUuXHJcbiAgICovXHJcbiAgcGxhdGZvcm06IHtcclxuICAgIGlkOiBQbGF0Zm9ybUlkO1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgdmVyc2lvbjogc3RyaW5nXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogaW5mb3JtYXRpb24gb2YgbW9iaWxlIGRldmljZSBhcyBwcm92aWRlZCBieSBDb3Jkb3ZhIGRldmljZSBwbHVnaW4uXHJcbiAgICpcclxuICAgKiBUaGlzIG1lbWJlciBjdXJyZW50bHkgaXMgYHVuZGVmaW5lZGAgaW4gYnJvd3NlciBhbmQgbm9kZSBlbnZpcm9ubWVudHMsIGJ1dCB0aGlzIG1heSBjaGFuZ2VcclxuICAgKiB3aXRob3V0IG5vdGljZS5cclxuICAgKi9cclxuICBkZXZpY2U/OiBNV2F5bGFic0RldmljZVBsdWdpbjtcclxufVxyXG5cclxuLyoqXHJcbiAqIHJlc29sdmVzIHRvIEluZm9ybWF0aW9uIG9iamVjdCBhcyBzb29uIGFzIHRoZSBkZXZpY2UgaXMgcmVhZHkuXHJcbiAqXHJcbiAqIEBpbnRlcm5hbCBTREsgY2xpZW50IGNvZGUgaXMgcmVxdWlyZWQgdG8gdXNlIGluaXQoKSB0byBvYnRhaW4gdGhlIEluZm9ybWF0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IHJlYWR5ID0gKCgpID0+IHtcclxuICAvLyBtdXN0IGJlIGV4dHJhY3RlZCBmcm9tIGdsb2JhbCBzY29wZSBvYmplY3QgYXMgb3RoZXJ3aXNlIHdlIGdldCBSZWZlcmVuY2VFcnJvciBpbiBub2RlLmpzXHJcbiAgY29uc3QgZG9jdW1lbnQ6IERvY3VtZW50ID0gZ2xvYmFsWydkb2N1bWVudCddO1xyXG4gIGNvbnN0IHdpbmRvdzogV2luZG93ID0gZ2xvYmFsWyd3aW5kb3cnXTtcclxuXHJcbiAgbGV0IHJlc29sdmVEb2N1bWVudDogKHZhbDogRG9jdW1lbnQgfCBRLlByb21pc2U8RG9jdW1lbnQ+KSA9PiB2b2lkO1xyXG4gIGNvbnN0IGNhbGxiYWNrID0gKCkgPT4ge1xyXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbG9hZCcsIGNhbGxiYWNrKTtcclxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBjYWxsYmFjayk7XHJcbiAgICByZXR1cm4gcmVzb2x2ZURvY3VtZW50KGRvY3VtZW50KTtcclxuICB9O1xyXG4gIHJldHVybiBRLlByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgLy8gcmVzb2x2ZXMgdG8gZG9jdW1lbnQgb25jZSB0aGUgRE9NIGlzIGxvYWRlZFxyXG4gICAgdHJ5IHtcclxuICAgICAgaWYgKCFkb2N1bWVudCB8fCBkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnY29tcGxldGUnKSB7XHJcbiAgICAgICAgcmVzb2x2ZShkb2N1bWVudCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIHJlc29sdmVEb2N1bWVudCA9IHJlc29sdmU7XHJcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBjYWxsYmFjaywgZmFsc2UpO1xyXG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgY2FsbGJhY2ssIGZhbHNlKTsgLy8gZmFsbGJhY2tcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICB9XHJcbiAgfSkudGhlbigoKSA9PiB7XHJcbiAgICAvLyByZXNvbHZlcyB0byB3aW5kb3cgb25jZSB0aGUgZGV2aWNlIGlzIHJlYWR5XHJcbiAgICByZXR1cm4gUS5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBpZiAoIXdpbmRvdyB8fCAhKFxyXG4gICAgICAgICAgJ2NvcmRvdmEnIGluIHdpbmRvdyB8fFxyXG4gICAgICAgICAgJ1Bob25lR2FwJyBpbiB3aW5kb3cgfHwgJ3Bob25lZ2FwJyBpbiB3aW5kb3cgfHxcclxuICAgICAgICAgICdmb3JnZScgaW4gd2luZG93KVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgcmVzb2x2ZSh3aW5kb3cpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBzZWUgaHR0cHM6Ly9jb3Jkb3ZhLmFwYWNoZS5vcmcvZG9jcy9lbi9sYXRlc3QvY29yZG92YS9ldmVudHMvZXZlbnRzLmh0bWwjZGV2aWNlcmVhZHlcclxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VyZWFkeScsICgpID0+IHtcclxuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignZGV2aWNlcmVhZHknLCBjYWxsYmFjayk7XHJcbiAgICAgICAgICAgIHJlc29sdmUod2luZG93KTtcclxuICAgICAgICB9LCBmYWxzZSk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfSkudGhlbigoKSA9PiB7XHJcbiAgICBjb25zdCBuYXZpZ2F0b3I6IE5hdmlnYXRvciA9IHdpbmRvdyAmJiB3aW5kb3cubmF2aWdhdG9yO1xyXG4gICAgY29uc3QgdXNlckFnZW50ID0gbmF2aWdhdG9yICYmIG5hdmlnYXRvci51c2VyQWdlbnQ7XHJcbiAgICBjb25zdCBhcHBWZXJzaW9uID0gbmF2aWdhdG9yICYmIG5hdmlnYXRvci5hcHBWZXJzaW9uO1xyXG4gICAgY29uc3QgZGV2aWNlOiBEZXZpY2UgPSB3aW5kb3cgJiYgd2luZG93WydkZXZpY2UnXTtcclxuXHJcbiAgICBjb25zdCBwbGF0Zm9ybU5hbWUgPSBkZXZpY2UgJiYgZGV2aWNlLnBsYXRmb3JtIHx8IHVzZXJBZ2VudCB8fCBwcm9jZXNzLnBsYXRmb3JtO1xyXG4gICAgY29uc3QgcGxhdGZvcm1WZXJzaW9uID0gZGV2aWNlICYmIGRldmljZS52ZXJzaW9uIHx8IHByb2Nlc3MudmVyc2lvbiB8fCBhcHBWZXJzaW9uO1xyXG4gICAgbGV0IHBsYXRmb3JtSWQ6IFBsYXRmb3JtSWQ7XHJcbiAgICBpZiAoL0FuZHJvaWQvaS50ZXN0KHBsYXRmb3JtTmFtZSkpIHtcclxuICAgICAgcGxhdGZvcm1JZCA9ICdhbmRyb2lkJztcclxuICAgIH0gZWxzZSBpZiAoL2lPU3xpUGhvbmV8aVBhZHxpUG9kL2kudGVzdChwbGF0Zm9ybU5hbWUpKSB7XHJcbiAgICAgIHBsYXRmb3JtSWQgPSAnaW9zJztcclxuICAgIH0gZWxzZSBpZiAoL1dpbmRvd3MgUGhvbmUvaS50ZXN0KHBsYXRmb3JtTmFtZSkgfHwgZGV2aWNlICYmXHJcbiAgICAgICAgICAgICAgIC9XaW5DRXxXaW4zMk5UL2kudGVzdChwbGF0Zm9ybU5hbWUpKSB7XHJcbiAgICAgIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vYXBhY2hlL2NvcmRvdmEtcGx1Z2luLWRldmljZSByZWdhcmRpbmcgV2luZG93cyBQaG9uZSA3LzggUXVpcmtzXHJcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICEvV2luQ0UvaS50ZXN0KHBsYXRmb3JtTmFtZSksXHJcbiAgICAgICAgJ1dpbmRvd3NDRSBkZXZpY2VzIGxpa2UgV2luZG93cyBQaG9uZSA3IGFuZCBiZWxvdyBhcmUgbm90IG9mZmljaWFsbHkgc3VwcG9ydGVkIScpO1xyXG4gICAgICBwbGF0Zm9ybUlkID0gJ3dpbmRvd3NwaG9uZSc7XHJcbiAgICB9IGVsc2UgaWYgKC9CbGFja0JlcnJ5L2kudGVzdChwbGF0Zm9ybU5hbWUpKSB7XHJcbiAgICAgIHBsYXRmb3JtSWQgPSAnYmxhY2tiZXJyeSc7XHJcbiAgICB9IGVsc2UgaWYgKG5hdmlnYXRvciB8fCBwcm9jZXNzWydicm93c2VyJ10pIHtcclxuICAgICAgcGxhdGZvcm1JZCA9ICdicm93c2VyJztcclxuICAgIH0gZWxzZSBpZiAocHJvY2VzcyAmJiByZXF1aXJlKSB7XHJcbiAgICAgIHBsYXRmb3JtSWQgPSAnbm9kZSc7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCghIXBsYXRmb3JtSWQsICd1bmtub3duIHBsYXRmb3JtOiAnICsgcGxhdGZvcm1OYW1lKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gPEluZm9ybWF0aW9uPntcclxuICAgICAgdXVpZDogZGV2aWNlICYmIGRldmljZS51dWlkLFxyXG4gICAgICBzZXJpYWw6IGRldmljZSAmJiBkZXZpY2Uuc2VyaWFsLFxyXG5cclxuICAgICAgbGFuZ3VhZ2U6IG5hdmlnYXRvciAmJiAobmF2aWdhdG9yLmxhbmd1YWdlIHx8IG5hdmlnYXRvclsndXNlckxhbmd1YWdlJ10pLFxyXG5cclxuICAgICAgcGxhdGZvcm06IHtcclxuICAgICAgICBpZDogcGxhdGZvcm1JZCxcclxuICAgICAgICBuYW1lOiBwbGF0Zm9ybU5hbWUsXHJcbiAgICAgICAgdmVyc2lvbjogcGxhdGZvcm1WZXJzaW9uXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICBkZXZpY2U6IGRldmljZVxyXG4gICAgfTtcclxuICB9KTtcclxufSkoKTtcclxuXHJcbi8vIG91dHB1dCBkaWFnbm9zdGljcyB0byB0aGUgY29uc29sZVxyXG5yZWFkeS5kb25lKChpbmZvKSA9PiB7XHJcbiAgZGlhZy5kZWJ1Zy5kZWJ1ZygnZGV2aWNlIGluZm9ybWF0aW9uOiAnLCBpbmZvKTtcclxufSk7XHJcbiJdfQ==