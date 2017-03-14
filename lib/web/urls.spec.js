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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJscy5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3dlYi91cmxzLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFFTixJQUFZLE1BQU0sV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUVqQyxJQUFZLElBQUksV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUNoQyxJQUFZLElBQUksV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUUvQixRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxVQUFVLEVBQUU7SUFDdEMsS0FBSyxDQUFDO1FBQ0osSUFBSSxDQUFDLElBQUksQ0FBQztZQUNSLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLFdBQVcsRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxDQUFDO1FBRUwsRUFBRSxDQUFDLGVBQWUsRUFBRTtZQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUNSLFNBQVMsRUFBRSxxQkFBcUI7YUFDakMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLHlEQUF5RCxDQUFDLEVBQ3hGLHdCQUF3QixDQUFDLENBQUM7WUFDNUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLG9DQUFvQyxDQUFDLEVBQ25FLHNCQUFzQixDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLEVBQ3ZELHNCQUFzQixDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUNsQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQzFCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsRUFDakMsc0JBQXNCLENBQUMsQ0FBQztZQUMxQixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQ25DLHNCQUFzQixDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxFQUN4QyxzQkFBc0IsQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQztRQUVGLEVBQUUsQ0FBQyxZQUFZLEVBQUU7WUFDZixJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUNSLFNBQVMsRUFBRSwwQkFBMEI7Z0JBQ3JDLFdBQVcsRUFBRSxPQUFPO2dCQUNwQixVQUFVLEVBQUUsTUFBTTthQUNuQixDQUFDLENBQUM7WUFFSCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMseURBQXlELENBQUMsRUFDckYseURBQXlELENBQUMsQ0FBQztZQUM3RCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsb0NBQW9DLENBQUMsRUFDaEUsNERBQTRELENBQUMsQ0FBQztZQUNoRSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsRUFDcEQsNERBQTRELENBQUMsQ0FBQztRQUNsRSxDQUFDLENBQUM7UUFFRixFQUFFLENBQUMsWUFBWSxFQUFFO1lBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDUixTQUFTLEVBQUUsb0JBQW9CO2dCQUMvQixVQUFVLEVBQUUsUUFBUTtnQkFDcEIsV0FBVyxFQUFFLFFBQVE7YUFDdEIsQ0FBQyxDQUFDO1lBRUgscURBQXFEO1lBQ3JELE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUU7Z0JBQ25DLFVBQVUsRUFBRSxLQUFLO2FBQ2xCLENBQUMsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUU7Z0JBQ25DLFVBQVUsRUFBRSxLQUFLO2FBQ2xCLENBQUMsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO1lBRXBDLDZEQUE2RDtZQUM3RCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztZQUN6RSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztRQUM1RSxDQUFDLENBQUM7S0FFSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgd2ViL3VybHMuc3BlYy50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMDguMDYuMjAxNlxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIHdlYlxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5cbmltcG9ydCAqIGFzIGNvcmUgZnJvbSAnLi4vY29yZSc7XG5pbXBvcnQgKiBhcyB1cmxzIGZyb20gJy4vdXJscyc7XG5cbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcbiAgYWZ0ZXIoKCkgPT4ge1xuICAgIGNvcmUuaW5pdCh7XG4gICAgICB0ZW5hbnRPcmdhOiBudWxsLFxuICAgICAgYXBwbGljYXRpb246IG51bGxcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBbXG5cbiAgICBpdCgncmVzb2x2ZVNlcnZlcicsICgpID0+IHtcbiAgICAgIGNvcmUuaW5pdCh7XG4gICAgICAgIHNlcnZlclVybDogJ2h0dHA6Ly9kZWZhdWx0OjgwODAnLFxuICAgICAgfSk7XG5cbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVTZXJ2ZXIoJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA5MC9td2F5L215YXBwL2FwaS92MS9zb21lX2VuZHBvaW50P0EnKSxcbiAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA5MC8nKTtcbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVTZXJ2ZXIoJy9td2F5L215YXBwL2FwaS92MS9zb21lX2VuZHBvaW50P0InKSxcbiAgICAgICAgJ2h0dHA6Ly9kZWZhdWx0OjgwODAvJyk7XG4gICAgICBhc3NlcnQuZXF1YWwodXJscy5yZXNvbHZlU2VydmVyKCdhcGkvdjEvc29tZV9lbmRwb2ludD9DJyksXG4gICAgICAgICdodHRwOi8vZGVmYXVsdDo4MDgwLycpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHVybHMucmVzb2x2ZVNlcnZlcignLycpLFxuICAgICAgICAnaHR0cDovL2RlZmF1bHQ6ODA4MC8nKTtcbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVTZXJ2ZXIoJycpLFxuICAgICAgICAnaHR0cDovL2RlZmF1bHQ6ODA4MC8nKTtcbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVTZXJ2ZXIobnVsbCksXG4gICAgICAgICdodHRwOi8vZGVmYXVsdDo4MDgwLycpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHVybHMucmVzb2x2ZVNlcnZlcih1bmRlZmluZWQpLFxuICAgICAgICAnaHR0cDovL2RlZmF1bHQ6ODA4MC8nKTtcbiAgICB9KSxcblxuICAgIGl0KCdyZXNvbHZlVXJsJywgKCkgPT4ge1xuICAgICAgY29yZS5pbml0KHtcbiAgICAgICAgc2VydmVyVXJsOiAnaHR0cDovLzE5Mi4xNjguMC4xMDo4MDgwJyxcbiAgICAgICAgYXBwbGljYXRpb246ICdteWFwcCcsXG4gICAgICAgIHRlbmFudE9yZ2E6ICdtd2F5J1xuICAgICAgfSk7XG5cbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVVcmwoJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA5MC9td2F5L215YXBwL2FwaS92MS9zb21lX2VuZHBvaW50P0EnKSxcbiAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA5MC9td2F5L215YXBwL2FwaS92MS9zb21lX2VuZHBvaW50P0EnKTtcbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVVcmwoJy9td2F5L215YXBwL2FwaS92MS9zb21lX2VuZHBvaW50P0InKSxcbiAgICAgICAgJ2h0dHA6Ly8xOTIuMTY4LjAuMTA6ODA4MC9td2F5L215YXBwL2FwaS92MS9zb21lX2VuZHBvaW50P0InKTtcbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVVcmwoJ2FwaS92MS9zb21lX2VuZHBvaW50P0MnKSxcbiAgICAgICAgJ2h0dHA6Ly8xOTIuMTY4LjAuMTA6ODA4MC9td2F5L215YXBwL2FwaS92MS9zb21lX2VuZHBvaW50P0MnKTtcbiAgICB9KSxcblxuICAgIGl0KCdyZXNvbHZlQXBwJywgKCkgPT4ge1xuICAgICAgY29yZS5pbml0KHtcbiAgICAgICAgc2VydmVyVXJsOiAnaHR0cDovL215aG9zdDo4MDgwJyxcbiAgICAgICAgdGVuYW50T3JnYTogJ3RlbmFudCcsXG4gICAgICAgIGFwcGxpY2F0aW9uOiAnYW55YXBwJ1xuICAgICAgfSk7XG5cbiAgICAgIC8vIGZvbGxvd2luZyByZXNvbHZlcyB1c2luZyBhbiBhbHRlcm5hdGl2ZSB0ZW5hbnRPcmdhXG4gICAgICBhc3NlcnQuZXF1YWwodXJscy5yZXNvbHZlQXBwKCdhcHAxJywge1xuICAgICAgICB0ZW5hbnRPcmdhOiAnYWJjJ1xuICAgICAgfSksICdodHRwOi8vbXlob3N0OjgwODAvYWJjL2FwcDEvJyk7XG4gICAgICBhc3NlcnQuZXF1YWwodXJscy5yZXNvbHZlQXBwKCdhcHAyJywge1xuICAgICAgICB0ZW5hbnRPcmdhOiAnYWJjJ1xuICAgICAgfSksICdodHRwOi8vbXlob3N0OjgwODAvYWJjL2FwcDIvJyk7XG5cbiAgICAgIC8vIGZvbGxvd2luZyByZXNvbHZlcyB1c2luZyB0ZW5hbnRPcmdhIGluaXRpYWxpemVkIHByZXZpb3VzbHlcbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVBcHAoJ2FwcDMnKSwgJ2h0dHA6Ly9teWhvc3Q6ODA4MC90ZW5hbnQvYXBwMy8nKTtcbiAgICAgIGFzc2VydC5lcXVhbCh1cmxzLnJlc29sdmVBcHAoJy9hcHA0JyksICdodHRwOi8vbXlob3N0OjgwODAvdGVuYW50L2FwcDQvJyk7XG4gICAgfSlcblxuICBdO1xufSk7XG4iXX0=