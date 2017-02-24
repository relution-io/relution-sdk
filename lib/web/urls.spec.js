/*
 * @file web/urls.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 08.06.2016
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
 * @module web
 */
/** */
"use strict";
var assert = require('assert');
var core = require('../core');
var urls = require('./urls');
describe(module.filename || __filename, function () {
    after(function () {
        core.init({
            tenantOrga: null,
            application: null
        });
    });
    return [
        it('resolveServer', function () {
            core.init({
                serverUrl: 'http://default:8080',
            });
            assert.equal(urls.resolveServer('http://localhost:8090/mway/myapp/api/v1/some_endpoint?A'), 'http://localhost:8090/');
            assert.equal(urls.resolveServer('/mway/myapp/api/v1/some_endpoint?B'), 'http://default:8080/');
            assert.equal(urls.resolveServer('api/v1/some_endpoint?C'), 'http://default:8080/');
            assert.equal(urls.resolveServer('/'), 'http://default:8080/');
            assert.equal(urls.resolveServer(''), 'http://default:8080/');
            assert.equal(urls.resolveServer(null), 'http://default:8080/');
            assert.equal(urls.resolveServer(undefined), 'http://default:8080/');
        }),
        it('resolveUrl', function () {
            core.init({
                serverUrl: 'http://192.168.0.10:8080',
                application: 'myapp',
                tenantOrga: 'mway'
            });
            assert.equal(urls.resolveUrl('http://localhost:8090/mway/myapp/api/v1/some_endpoint?A'), 'http://localhost:8090/mway/myapp/api/v1/some_endpoint?A');
            assert.equal(urls.resolveUrl('/mway/myapp/api/v1/some_endpoint?B'), 'http://192.168.0.10:8080/mway/myapp/api/v1/some_endpoint?B');
            assert.equal(urls.resolveUrl('api/v1/some_endpoint?C'), 'http://192.168.0.10:8080/mway/myapp/api/v1/some_endpoint?C');
        }),
        it('resolveApp', function () {
            core.init({
                serverUrl: 'http://myhost:8080',
                tenantOrga: 'tenant',
                application: 'anyapp'
            });
            // following resolves using an alternative tenantOrga
            assert.equal(urls.resolveApp('app1', {
                tenantOrga: 'abc'
            }), 'http://myhost:8080/abc/app1/');
            assert.equal(urls.resolveApp('app2', {
                tenantOrga: 'abc'
            }), 'http://myhost:8080/abc/app2/');
            // following resolves using tenantOrga initialized previously
            assert.equal(urls.resolveApp('app3'), 'http://myhost:8080/tenant/app3/');
            assert.equal(urls.resolveApp('/app4'), 'http://myhost:8080/tenant/app4/');
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJscy5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3dlYi91cmxzLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFFTixJQUFZLE1BQU0sV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUVqQyxJQUFZLElBQUksV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUNoQyxJQUFZLElBQUksV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUUvQixRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxVQUFVLEVBQUU7SUFDdEMsS0FBSyxDQUFDO1FBQ0osSUFBSSxDQUFDLElBQUksQ0FBQztZQUNSLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLFdBQVcsRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxDQUFDO1FBRUwsRUFBRSxDQUFDLGVBQWUsRUFBRTtZQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUNSLFNBQVMsRUFBRSxxQkFBcUI7YUFDakMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLHlEQUF5RCxDQUFDLEVBQ3hGLHdCQUF3QixDQUFDLENBQUM7WUFDNUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLG9DQUFvQyxDQUFDLEVBQ25FLHNCQUFzQixDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLEVBQ3ZELHNCQUFzQixDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUNsQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQzFCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsRUFDakMsc0JBQXNCLENBQUMsQ0FBQztZQUMxQixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQ25DLHNCQUFzQixDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxFQUN4QyxzQkFBc0IsQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQztRQUVGLEVBQUUsQ0FBQyxZQUFZLEVBQUU7WUFDZixJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUNSLFNBQVMsRUFBRSwwQkFBMEI7Z0JBQ3JDLFdBQVcsRUFBRSxPQUFPO2dCQUNwQixVQUFVLEVBQUUsTUFBTTthQUNuQixDQUFDLENBQUM7WUFFSCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMseURBQXlELENBQUMsRUFDckYseURBQXlELENBQUMsQ0FBQztZQUM3RCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsb0NBQW9DLENBQUMsRUFDaEUsNERBQTRELENBQUMsQ0FBQztZQUNoRSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsRUFDcEQsNERBQTRELENBQUMsQ0FBQztRQUNsRSxDQUFDLENBQUM7UUFFRixFQUFFLENBQUMsWUFBWSxFQUFFO1lBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDUixTQUFTLEVBQUUsb0JBQW9CO2dCQUMvQixVQUFVLEVBQUUsUUFBUTtnQkFDcEIsV0FBVyxFQUFFLFFBQVE7YUFDdEIsQ0FBQyxDQUFDO1lBRUgscURBQXFEO1lBQ3JELE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUU7Z0JBQ25DLFVBQVUsRUFBRSxLQUFLO2FBQ2xCLENBQUMsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUU7Z0JBQ25DLFVBQVUsRUFBRSxLQUFLO2FBQ2xCLENBQUMsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO1lBRXBDLDZEQUE2RDtZQUM3RCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztZQUN6RSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztRQUM1RSxDQUFDLENBQUM7S0FFSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gKiBAZmlsZSB3ZWIvdXJscy5zcGVjLnRzXHJcbiAqIFJlbHV0aW9uIFNES1xyXG4gKlxyXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAwOC4wNi4yMDE2XHJcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQG1vZHVsZSB3ZWJcclxuICovXHJcbi8qKiAqL1xyXG5cclxuaW1wb3J0ICogYXMgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XHJcblxyXG5pbXBvcnQgKiBhcyBjb3JlIGZyb20gJy4uL2NvcmUnO1xyXG5pbXBvcnQgKiBhcyB1cmxzIGZyb20gJy4vdXJscyc7XHJcblxyXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XHJcbiAgYWZ0ZXIoKCkgPT4ge1xyXG4gICAgY29yZS5pbml0KHtcclxuICAgICAgdGVuYW50T3JnYTogbnVsbCxcclxuICAgICAgYXBwbGljYXRpb246IG51bGxcclxuICAgIH0pO1xyXG4gIH0pO1xyXG4gIHJldHVybiBbXHJcblxyXG4gICAgaXQoJ3Jlc29sdmVTZXJ2ZXInLCAoKSA9PiB7XHJcbiAgICAgIGNvcmUuaW5pdCh7XHJcbiAgICAgICAgc2VydmVyVXJsOiAnaHR0cDovL2RlZmF1bHQ6ODA4MCcsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXNzZXJ0LmVxdWFsKHVybHMucmVzb2x2ZVNlcnZlcignaHR0cDovL2xvY2FsaG9zdDo4MDkwL213YXkvbXlhcHAvYXBpL3YxL3NvbWVfZW5kcG9pbnQ/QScpLFxyXG4gICAgICAgICdodHRwOi8vbG9jYWxob3N0OjgwOTAvJyk7XHJcbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVTZXJ2ZXIoJy9td2F5L215YXBwL2FwaS92MS9zb21lX2VuZHBvaW50P0InKSxcclxuICAgICAgICAnaHR0cDovL2RlZmF1bHQ6ODA4MC8nKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKHVybHMucmVzb2x2ZVNlcnZlcignYXBpL3YxL3NvbWVfZW5kcG9pbnQ/QycpLFxyXG4gICAgICAgICdodHRwOi8vZGVmYXVsdDo4MDgwLycpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwodXJscy5yZXNvbHZlU2VydmVyKCcvJyksXHJcbiAgICAgICAgJ2h0dHA6Ly9kZWZhdWx0OjgwODAvJyk7XHJcbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVTZXJ2ZXIoJycpLFxyXG4gICAgICAgICdodHRwOi8vZGVmYXVsdDo4MDgwLycpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwodXJscy5yZXNvbHZlU2VydmVyKG51bGwpLFxyXG4gICAgICAgICdodHRwOi8vZGVmYXVsdDo4MDgwLycpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwodXJscy5yZXNvbHZlU2VydmVyKHVuZGVmaW5lZCksXHJcbiAgICAgICAgJ2h0dHA6Ly9kZWZhdWx0OjgwODAvJyk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgncmVzb2x2ZVVybCcsICgpID0+IHtcclxuICAgICAgY29yZS5pbml0KHtcclxuICAgICAgICBzZXJ2ZXJVcmw6ICdodHRwOi8vMTkyLjE2OC4wLjEwOjgwODAnLFxyXG4gICAgICAgIGFwcGxpY2F0aW9uOiAnbXlhcHAnLFxyXG4gICAgICAgIHRlbmFudE9yZ2E6ICdtd2F5J1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVVcmwoJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA5MC9td2F5L215YXBwL2FwaS92MS9zb21lX2VuZHBvaW50P0EnKSxcclxuICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDo4MDkwL213YXkvbXlhcHAvYXBpL3YxL3NvbWVfZW5kcG9pbnQ/QScpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwodXJscy5yZXNvbHZlVXJsKCcvbXdheS9teWFwcC9hcGkvdjEvc29tZV9lbmRwb2ludD9CJyksXHJcbiAgICAgICAgJ2h0dHA6Ly8xOTIuMTY4LjAuMTA6ODA4MC9td2F5L215YXBwL2FwaS92MS9zb21lX2VuZHBvaW50P0InKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKHVybHMucmVzb2x2ZVVybCgnYXBpL3YxL3NvbWVfZW5kcG9pbnQ/QycpLFxyXG4gICAgICAgICdodHRwOi8vMTkyLjE2OC4wLjEwOjgwODAvbXdheS9teWFwcC9hcGkvdjEvc29tZV9lbmRwb2ludD9DJyk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgncmVzb2x2ZUFwcCcsICgpID0+IHtcclxuICAgICAgY29yZS5pbml0KHtcclxuICAgICAgICBzZXJ2ZXJVcmw6ICdodHRwOi8vbXlob3N0OjgwODAnLFxyXG4gICAgICAgIHRlbmFudE9yZ2E6ICd0ZW5hbnQnLFxyXG4gICAgICAgIGFwcGxpY2F0aW9uOiAnYW55YXBwJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIGZvbGxvd2luZyByZXNvbHZlcyB1c2luZyBhbiBhbHRlcm5hdGl2ZSB0ZW5hbnRPcmdhXHJcbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVBcHAoJ2FwcDEnLCB7XHJcbiAgICAgICAgdGVuYW50T3JnYTogJ2FiYydcclxuICAgICAgfSksICdodHRwOi8vbXlob3N0OjgwODAvYWJjL2FwcDEvJyk7XHJcbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVBcHAoJ2FwcDInLCB7XHJcbiAgICAgICAgdGVuYW50T3JnYTogJ2FiYydcclxuICAgICAgfSksICdodHRwOi8vbXlob3N0OjgwODAvYWJjL2FwcDIvJyk7XHJcblxyXG4gICAgICAvLyBmb2xsb3dpbmcgcmVzb2x2ZXMgdXNpbmcgdGVuYW50T3JnYSBpbml0aWFsaXplZCBwcmV2aW91c2x5XHJcbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVBcHAoJ2FwcDMnKSwgJ2h0dHA6Ly9teWhvc3Q6ODA4MC90ZW5hbnQvYXBwMy8nKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKHVybHMucmVzb2x2ZUFwcCgnL2FwcDQnKSwgJ2h0dHA6Ly9teWhvc3Q6ODA4MC90ZW5hbnQvYXBwNC8nKTtcclxuICAgIH0pXHJcblxyXG4gIF07XHJcbn0pO1xyXG4iXX0=