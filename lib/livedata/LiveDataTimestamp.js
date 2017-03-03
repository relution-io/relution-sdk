/*
 * @file livedata/LiveDataTimestamp.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 07.12.2015
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
 * @module livedata
 */
/** */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var Model_1 = require('./Model');
var diag = require('../core/diag');
/**
 * timestamp packed into a Model.
 *
 * @module Relution.livedata.LiveDataTimestamp
 *
 * @type {*}
 */
var LiveDataTimestampModel = (function (_super) {
    __extends(LiveDataTimestampModel, _super);
    function LiveDataTimestampModel() {
        _super.apply(this, arguments);
    }
    return LiveDataTimestampModel;
}(Model_1.Model));
exports.LiveDataTimestampModel = LiveDataTimestampModel;
// mixins
var timestampmodel = _.extend(LiveDataTimestampModel.prototype, {
    _type: 'Relution.livedata.LiveDataTimestampModel',
    entity: '__timestamp__',
    idAttribute: 'channel'
});
diag.debug.assert(function () { return LiveDataTimestampModel.prototype.isPrototypeOf(Object.create(timestampmodel)); });
diag.debug.assert(function () { return new LiveDataTimestampModel({ channel: 'check' }).id === 'check'; });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGl2ZURhdGFUaW1lc3RhbXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvTGl2ZURhdGFUaW1lc3RhbXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRTVCLHNCQUFvQixTQUFTLENBQUMsQ0FBQTtBQUU5QixJQUFZLElBQUksV0FBTSxjQUFjLENBQUMsQ0FBQTtBQXNCckM7Ozs7OztHQU1HO0FBQ0g7SUFBNEMsMENBQUs7SUFBakQ7UUFBNEMsOEJBQUs7SUFPakQsQ0FBQztJQUFELDZCQUFDO0FBQUQsQ0FBQyxBQVBELENBQTRDLGFBQUssR0FPaEQ7QUFQWSw4QkFBc0IseUJBT2xDLENBQUE7QUFFRCxTQUFTO0FBQ1QsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLEVBQUU7SUFDOUQsS0FBSyxFQUFFLDBDQUEwQztJQUNqRCxNQUFNLEVBQUUsZUFBZTtJQUN2QixXQUFXLEVBQUUsU0FBUztDQUN2QixDQUFDLENBQUM7QUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsc0JBQXNCLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQTdFLENBQTZFLENBQUMsQ0FBQztBQUN2RyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsSUFBSSxzQkFBc0IsQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxPQUFPLEVBQS9ELENBQStELENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBsaXZlZGF0YS9MaXZlRGF0YVRpbWVzdGFtcC50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMDcuMTIuMjAxNVxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIGxpdmVkYXRhXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCB7TW9kZWx9IGZyb20gJy4vTW9kZWwnO1xuXG5pbXBvcnQgKiBhcyBkaWFnIGZyb20gJy4uL2NvcmUvZGlhZyc7XG5cbi8qKlxuICogdXNlZCB0byBwZXJzaXN0IGxhc3QgbWVzc2FnZSB0aW1lc3RhbXAgZGF0YS5cbiAqXG4gKiBAbW9kdWxlIFJlbHV0aW9uLmxpdmVkYXRhLkxpdmVEYXRhVGltZXN0YW1wXG4gKlxuICogQHR5cGUgeyp9XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGl2ZURhdGFUaW1lc3RhbXAge1xuXG4gIC8qKlxuICAgKiBjaGFubmVsIHRoZSB0aW1lc3RhbXAgYmVsb25ncyB0by5cbiAgICovXG4gIGNoYW5uZWw6IHN0cmluZztcblxuICAvKipcbiAgICogdmFsdWUgc3RvcmVkLlxuICAgKi9cbiAgdGltZXN0YW1wOiBudW1iZXI7XG59XG5cbi8qKlxuICogdGltZXN0YW1wIHBhY2tlZCBpbnRvIGEgTW9kZWwuXG4gKlxuICogQG1vZHVsZSBSZWx1dGlvbi5saXZlZGF0YS5MaXZlRGF0YVRpbWVzdGFtcFxuICpcbiAqIEB0eXBlIHsqfVxuICovXG5leHBvcnQgY2xhc3MgTGl2ZURhdGFUaW1lc3RhbXBNb2RlbCBleHRlbmRzIE1vZGVsLyo8TGl2ZURhdGFUaW1lc3RhbXA+Ki8ge1xuXG4gIC8qKlxuICAgKiByZWRlZmluZWQgdG8gY29uY3JldGUgdHlwZSBvZiBhdHRyaWJ1dGVzLlxuICAgKi9cbiAgcHVibGljIGF0dHJpYnV0ZXM6IExpdmVEYXRhVGltZXN0YW1wO1xuXG59XG5cbi8vIG1peGluc1xubGV0IHRpbWVzdGFtcG1vZGVsID0gXy5leHRlbmQoTGl2ZURhdGFUaW1lc3RhbXBNb2RlbC5wcm90b3R5cGUsIHtcbiAgX3R5cGU6ICdSZWx1dGlvbi5saXZlZGF0YS5MaXZlRGF0YVRpbWVzdGFtcE1vZGVsJyxcbiAgZW50aXR5OiAnX190aW1lc3RhbXBfXycsXG4gIGlkQXR0cmlidXRlOiAnY2hhbm5lbCdcbn0pO1xuZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gTGl2ZURhdGFUaW1lc3RhbXBNb2RlbC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihPYmplY3QuY3JlYXRlKHRpbWVzdGFtcG1vZGVsKSkpO1xuZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gbmV3IExpdmVEYXRhVGltZXN0YW1wTW9kZWwoeyBjaGFubmVsOiAnY2hlY2snIH0pLmlkID09PSAnY2hlY2snKTtcbiJdfQ==