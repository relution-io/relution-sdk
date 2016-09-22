/*
 * @file index.lazy.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 22.07.2016
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
 * @module Relution
 */
/** */
"use strict";
var core = require('./core');
/**
 * lazy loads modules at runtime.
 *
 * An instance of Relution is set as prototype on the module exports. When a get property accessor
 * of an exposed member is read, a require statement is executed loading the actual implementation
 * code and the property is redefined to the resultant value.
 *
 * For supporting diagnostics, the core module is an exception and must be loaded eagerly.
 */
var Relution = (function () {
    function Relution() {
        // aliases
        this.init = core.init;
        this.debug = core.debug;
        // core module
        this.core = core;
    }
    Relution.resetProperty = function (property, value) {
        Object.defineProperty(exports, property, {
            value: value
        });
        return value;
    };
    ;
    Object.defineProperty(Relution.prototype, "version", {
        // version
        get: function () {
            core.debug.debug('lazy loading Relution.version...');
            var pkgjson = require('../package.json');
            return Relution.resetProperty('version', pkgjson.version);
        },
        enumerable: true,
        configurable: true
    });
    ;
    Object.defineProperty(Relution.prototype, "model", {
        // model module
        get: function () {
            core.debug.debug('lazy loading Relution.model...');
            return Relution.resetProperty('model', require('./model'));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Relution.prototype, "query", {
        // query module
        get: function () {
            core.debug.debug('lazy loading Relution.query...');
            return Relution.resetProperty('query', require('./query'));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Relution.prototype, "security", {
        // security module
        get: function () {
            core.debug.debug('lazy loading Relution.security...');
            return Relution.resetProperty('security', require('./security'));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Relution.prototype, "web", {
        // web module
        get: function () {
            core.debug.debug('lazy loading Relution.web...');
            return Relution.resetProperty('web', require('./web'));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Relution.prototype, "push", {
        // push module
        get: function () {
            core.debug.debug('lazy loading Relution.push...');
            return Relution.resetProperty('push', require('./push'));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Relution.prototype, "connector", {
        // connector module
        get: function () {
            core.debug.debug('lazy loading Relution.connector ...');
            return Relution.resetProperty('connector', require('./connector'));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Relution.prototype, "livedata", {
        // livedata module
        get: function () {
            core.debug.debug('lazy loading Relution.livedata ...');
            return Relution.resetProperty('livedata', require('./livedata'));
        },
        enumerable: true,
        configurable: true
    });
    return Relution;
}());
;
Object.setPrototypeOf(exports, new Relution());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubGF6eS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5sYXp5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBR04sSUFBWSxJQUFJLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFL0I7Ozs7Ozs7O0dBUUc7QUFDSDtJQUFBO1FBZ0JBLFVBQVU7UUFDUixTQUFJLEdBQXNCLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDcEMsVUFBSyxHQUF1QixJQUFJLENBQUMsS0FBSyxDQUFDO1FBRXpDLGNBQWM7UUFDWixTQUFJLEdBQXNCLElBQUksQ0FBQztJQTRDakMsQ0FBQztJQS9EZ0Isc0JBQWEsR0FBNUIsVUFBZ0MsUUFBZ0IsRUFBRSxLQUFRO1FBQ3hELE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRTtZQUN2QyxLQUFLLEVBQUUsS0FBSztTQUNiLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDZixDQUFDOztJQUdELHNCQUFJLDZCQUFPO1FBRGIsVUFBVTthQUNSO1lBQ0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQztZQUNyRCxJQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUMzQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVELENBQUM7OztPQUFBOztJQVVELHNCQUFJLDJCQUFLO1FBRFgsZUFBZTthQUNiO1lBQ0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztZQUNuRCxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDN0QsQ0FBQzs7O09BQUE7SUFHRCxzQkFBSSwyQkFBSztRQURYLGVBQWU7YUFDYjtZQUNFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7WUFDbkQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQzdELENBQUM7OztPQUFBO0lBR0Qsc0JBQUksOEJBQVE7UUFEZCxrQkFBa0I7YUFDaEI7WUFDRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1lBQ3RELE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNuRSxDQUFDOzs7T0FBQTtJQUdELHNCQUFJLHlCQUFHO1FBRFQsYUFBYTthQUNYO1lBQ0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQztZQUNqRCxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDekQsQ0FBQzs7O09BQUE7SUFHRCxzQkFBSSwwQkFBSTtRQURWLGNBQWM7YUFDWjtZQUNFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7WUFDbEQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzNELENBQUM7OztPQUFBO0lBR0Qsc0JBQUksK0JBQVM7UUFEZixtQkFBbUI7YUFDakI7WUFDRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUNyRSxDQUFDOzs7T0FBQTtJQUdELHNCQUFJLDhCQUFRO1FBRGQsa0JBQWtCO2FBQ2hCO1lBQ0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQztZQUN2RCxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDbkUsQ0FBQzs7O09BQUE7SUFFSCxlQUFDO0FBQUQsQ0FBQyxBQWpFRCxJQWlFQztBQUFBLENBQUM7QUFFSSxNQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxJQUFJLFFBQVEsRUFBRSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgaW5kZXgubGF6eS50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMjIuMDcuMjAxNlxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIFJlbHV0aW9uXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQgKiBhcyBpbmRleCBmcm9tICcuL2luZGV4JztcbmltcG9ydCAqIGFzIGNvcmUgZnJvbSAnLi9jb3JlJztcblxuLyoqXG4gKiBsYXp5IGxvYWRzIG1vZHVsZXMgYXQgcnVudGltZS5cbiAqXG4gKiBBbiBpbnN0YW5jZSBvZiBSZWx1dGlvbiBpcyBzZXQgYXMgcHJvdG90eXBlIG9uIHRoZSBtb2R1bGUgZXhwb3J0cy4gV2hlbiBhIGdldCBwcm9wZXJ0eSBhY2Nlc3NvclxuICogb2YgYW4gZXhwb3NlZCBtZW1iZXIgaXMgcmVhZCwgYSByZXF1aXJlIHN0YXRlbWVudCBpcyBleGVjdXRlZCBsb2FkaW5nIHRoZSBhY3R1YWwgaW1wbGVtZW50YXRpb25cbiAqIGNvZGUgYW5kIHRoZSBwcm9wZXJ0eSBpcyByZWRlZmluZWQgdG8gdGhlIHJlc3VsdGFudCB2YWx1ZS5cbiAqXG4gKiBGb3Igc3VwcG9ydGluZyBkaWFnbm9zdGljcywgdGhlIGNvcmUgbW9kdWxlIGlzIGFuIGV4Y2VwdGlvbiBhbmQgbXVzdCBiZSBsb2FkZWQgZWFnZXJseS5cbiAqL1xuY2xhc3MgUmVsdXRpb24ge1xuXG4gIHByaXZhdGUgc3RhdGljIHJlc2V0UHJvcGVydHk8VD4ocHJvcGVydHk6IHN0cmluZywgdmFsdWU6IFQpOiBUIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgcHJvcGVydHksIHtcbiAgICAgIHZhbHVlOiB2YWx1ZVxuICAgIH0pO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuLy8gdmVyc2lvblxuICBnZXQgdmVyc2lvbigpOiB0eXBlb2YgaW5kZXgudmVyc2lvbiB7XG4gICAgY29yZS5kZWJ1Zy5kZWJ1ZygnbGF6eSBsb2FkaW5nIFJlbHV0aW9uLnZlcnNpb24uLi4nKTtcbiAgICBjb25zdCBwa2dqc29uID0gcmVxdWlyZSgnLi4vcGFja2FnZS5qc29uJyk7XG4gICAgcmV0dXJuIFJlbHV0aW9uLnJlc2V0UHJvcGVydHkoJ3ZlcnNpb24nLCBwa2dqc29uLnZlcnNpb24pO1xuICB9O1xuXG4vLyBhbGlhc2VzXG4gIGluaXQ6IHR5cGVvZiBpbmRleC5pbml0ID0gY29yZS5pbml0O1xuICBkZWJ1ZzogdHlwZW9mIGluZGV4LmRlYnVnID0gY29yZS5kZWJ1ZztcblxuLy8gY29yZSBtb2R1bGVcbiAgY29yZTogdHlwZW9mIGluZGV4LmNvcmUgPSBjb3JlO1xuXG4vLyBtb2RlbCBtb2R1bGVcbiAgZ2V0IG1vZGVsKCk6IHR5cGVvZiBpbmRleC5tb2RlbCB7XG4gICAgY29yZS5kZWJ1Zy5kZWJ1ZygnbGF6eSBsb2FkaW5nIFJlbHV0aW9uLm1vZGVsLi4uJyk7XG4gICAgcmV0dXJuIFJlbHV0aW9uLnJlc2V0UHJvcGVydHkoJ21vZGVsJywgcmVxdWlyZSgnLi9tb2RlbCcpKTtcbiAgfVxuXG4vLyBxdWVyeSBtb2R1bGVcbiAgZ2V0IHF1ZXJ5KCk6IHR5cGVvZiBpbmRleC5xdWVyeSB7XG4gICAgY29yZS5kZWJ1Zy5kZWJ1ZygnbGF6eSBsb2FkaW5nIFJlbHV0aW9uLnF1ZXJ5Li4uJyk7XG4gICAgcmV0dXJuIFJlbHV0aW9uLnJlc2V0UHJvcGVydHkoJ3F1ZXJ5JywgcmVxdWlyZSgnLi9xdWVyeScpKTtcbiAgfVxuXG4vLyBzZWN1cml0eSBtb2R1bGVcbiAgZ2V0IHNlY3VyaXR5KCk6IHR5cGVvZiBpbmRleC5zZWN1cml0eSB7XG4gICAgY29yZS5kZWJ1Zy5kZWJ1ZygnbGF6eSBsb2FkaW5nIFJlbHV0aW9uLnNlY3VyaXR5Li4uJyk7XG4gICAgcmV0dXJuIFJlbHV0aW9uLnJlc2V0UHJvcGVydHkoJ3NlY3VyaXR5JywgcmVxdWlyZSgnLi9zZWN1cml0eScpKTtcbiAgfVxuXG4vLyB3ZWIgbW9kdWxlXG4gIGdldCB3ZWIoKTogdHlwZW9mIGluZGV4LndlYiB7XG4gICAgY29yZS5kZWJ1Zy5kZWJ1ZygnbGF6eSBsb2FkaW5nIFJlbHV0aW9uLndlYi4uLicpO1xuICAgIHJldHVybiBSZWx1dGlvbi5yZXNldFByb3BlcnR5KCd3ZWInLCByZXF1aXJlKCcuL3dlYicpKTtcbiAgfVxuXG4vLyBwdXNoIG1vZHVsZVxuICBnZXQgcHVzaCgpOiB0eXBlb2YgaW5kZXgucHVzaCB7XG4gICAgY29yZS5kZWJ1Zy5kZWJ1ZygnbGF6eSBsb2FkaW5nIFJlbHV0aW9uLnB1c2guLi4nKTtcbiAgICByZXR1cm4gUmVsdXRpb24ucmVzZXRQcm9wZXJ0eSgncHVzaCcsIHJlcXVpcmUoJy4vcHVzaCcpKTtcbiAgfVxuXG4vLyBjb25uZWN0b3IgbW9kdWxlXG4gIGdldCBjb25uZWN0b3IoKTogdHlwZW9mIGluZGV4LmNvbm5lY3RvciB7XG4gICAgY29yZS5kZWJ1Zy5kZWJ1ZygnbGF6eSBsb2FkaW5nIFJlbHV0aW9uLmNvbm5lY3RvciAuLi4nKTtcbiAgICByZXR1cm4gUmVsdXRpb24ucmVzZXRQcm9wZXJ0eSgnY29ubmVjdG9yJywgcmVxdWlyZSgnLi9jb25uZWN0b3InKSk7XG4gIH1cblxuLy8gbGl2ZWRhdGEgbW9kdWxlXG4gIGdldCBsaXZlZGF0YSgpOiB0eXBlb2YgaW5kZXgubGl2ZWRhdGEge1xuICAgIGNvcmUuZGVidWcuZGVidWcoJ2xhenkgbG9hZGluZyBSZWx1dGlvbi5saXZlZGF0YSAuLi4nKTtcbiAgICByZXR1cm4gUmVsdXRpb24ucmVzZXRQcm9wZXJ0eSgnbGl2ZWRhdGEnLCByZXF1aXJlKCcuL2xpdmVkYXRhJykpO1xuICB9XG5cbn07XG5cbig8YW55Pk9iamVjdCkuc2V0UHJvdG90eXBlT2YoZXhwb3J0cywgbmV3IFJlbHV0aW9uKCkpO1xuIl19