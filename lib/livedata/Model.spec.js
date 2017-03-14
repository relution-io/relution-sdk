/*
 * @file livedata/Model.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.06.2016
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
var chai_1 = require('chai');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
var Store_1 = require('./Store');
describe(module.filename || __filename, function () {
    return [
        it('isModel', function () {
            chai_1.assert.isFalse(Model_1.isModel(undefined));
            chai_1.assert.isFalse(Model_1.isModel(null));
            chai_1.assert.isFalse(Model_1.isModel(''));
            chai_1.assert.isFalse(Model_1.isModel(0));
            chai_1.assert.isFalse(Model_1.isModel(1));
            chai_1.assert.isFalse(Model_1.isModel({}));
            chai_1.assert.isFalse(Model_1.isModel([]));
            chai_1.assert.isFalse(Model_1.isModel(Model_1.Model));
            chai_1.assert.isTrue(Model_1.isModel(new Model_1.Model()));
            chai_1.assert.isFalse(Model_1.isModel(Collection_1.Collection));
            chai_1.assert.isFalse(Model_1.isModel(new Collection_1.Collection()));
            chai_1.assert.isFalse(Model_1.isModel(Store_1.Store));
            chai_1.assert.isFalse(Model_1.isModel(new Store_1.Store()));
        }),
        it('basic', function () {
            chai_1.assert.isDefined(Model_1.Model);
            chai_1.assert.isFunction(Model_1.Model);
            var instance = new Model_1.Model();
            chai_1.assert.isDefined(instance);
            chai_1.assert.isObject(instance);
            chai_1.assert.isDefined(instance._type);
            chai_1.assert.isString(instance._type);
            chai_1.assert.equal(instance._type, 'Relution.livedata.Model');
        }),
        it('creating model', function () {
            chai_1.assert.typeOf(Model_1.Model, 'function', 'Model is defined.');
            var Person = (function (_super) {
                __extends(Person, _super);
                function Person() {
                    _super.apply(this, arguments);
                }
                return Person;
            }(Model_1.Model.defaults({
                idAttribute: 'id',
                defaults: {
                    bmi: 0.0
                },
                entity: 'person',
            })));
            ;
            chai_1.assert.typeOf(Person, 'function', 'person model could be extended.');
            chai_1.assert.typeOf(new Person(), 'object', 'empty person model could be created.');
            var p = new Person({
                firstName: 'Max',
                sureName: 'Mustermann',
                notes: 'Notes to this person',
                address: { street: 'Leitzstraße', house_nr: 45, zip: '70469', city: 'Stuttgart' }
            });
            chai_1.assert.ok(typeof p === 'object', 'person record could be created.');
            chai_1.assert.ok(p.get('firstName') === 'Max', 'Field "firstName" is set.');
            chai_1.assert.ok(p.get('sureName') === 'Mustermann', 'Field "sureName" is set.');
            chai_1.assert.ok(p.get('bmi') === 0.0, 'Field "bmi" has correct default value.');
            chai_1.assert.ok(p.get('notes') === 'Notes to this person', 'Field "note" has correct value.');
            chai_1.assert.ok(typeof p.get('id') === 'undefined', 'Field "id" is undefined, as expected.');
            chai_1.assert.ok(p.get('address').street === 'Leitzstraße', 'Field "address" has correct value.');
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9kZWwuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9Nb2RlbC5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFFNUIsc0JBQTZCLFNBQVMsQ0FBQyxDQUFBO0FBQ3ZDLDJCQUF5QixjQUFjLENBQUMsQ0FBQTtBQUN4QyxzQkFBb0IsU0FBUyxDQUFDLENBQUE7QUFFOUIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksVUFBVSxFQUFFO0lBQ3RDLE1BQU0sQ0FBQztRQUVMLEVBQUUsQ0FBQyxTQUFTLEVBQUU7WUFDWixhQUFNLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ25DLGFBQU0sQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDOUIsYUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1QixhQUFNLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNCLGFBQU0sQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsYUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1QixhQUFNLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVCLGFBQU0sQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLGFBQUssQ0FBQyxDQUFDLENBQUM7WUFDL0IsYUFBTSxDQUFDLE1BQU0sQ0FBQyxlQUFPLENBQUMsSUFBSSxhQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDcEMsYUFBTSxD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Q0FBQyxLQUFLLFdBQVcsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO1lBQ3ZGLGFBQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEtBQUssYUFBYSxFQUFFLG9DQUFvQyxDQUFDLENBQUM7UUFDN0YsQ0FBQyxDQUFDO0tBRUgsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIGxpdmVkYXRhL01vZGVsLnNwZWMudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI4LjA2LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXZlZGF0YVxuICovXG4vKiogKi9cblxuaW1wb3J0IHthc3NlcnR9IGZyb20gJ2NoYWknO1xuXG5pbXBvcnQge01vZGVsLCBpc01vZGVsfSBmcm9tICcuL01vZGVsJztcbmltcG9ydCB7Q29sbGVjdGlvbn0gZnJvbSAnLi9Db2xsZWN0aW9uJztcbmltcG9ydCB7U3RvcmV9IGZyb20gJy4vU3RvcmUnO1xuXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBbXG5cbiAgICBpdCgnaXNNb2RlbCcsICgpID0+IHtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwodW5kZWZpbmVkKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc01vZGVsKG51bGwpKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwoJycpKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwoMCkpO1xuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNNb2RlbCgxKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc01vZGVsKHt9KSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc01vZGVsKFtdKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc01vZGVsKE1vZGVsKSk7XG4gICAgICBhc3NlcnQuaXNUcnVlKGlzTW9kZWwobmV3IE1vZGVsKCkpKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwoQ29sbGVjdGlvbikpO1xuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNNb2RlbChuZXcgQ29sbGVjdGlvbigpKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc01vZGVsKFN0b3JlKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc01vZGVsKG5ldyBTdG9yZSgpKSk7XG4gICAgfSksXG5cbiAgICBpdCgnYmFzaWMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBhc3NlcnQuaXNEZWZpbmVkKE1vZGVsKTtcbiAgICAgIGFzc2VydC5pc0Z1bmN0aW9uKE1vZGVsKTtcblxuICAgICAgdmFyIGluc3RhbmNlID0gbmV3IE1vZGVsKCk7XG4gICAgICBhc3NlcnQuaXNEZWZpbmVkKGluc3RhbmNlKTtcbiAgICAgIGFzc2VydC5pc09iamVjdChpbnN0YW5jZSk7XG4gICAgICBhc3NlcnQuaXNEZWZpbmVkKGluc3RhbmNlLl90eXBlKTtcbiAgICAgIGFzc2VydC5pc1N0cmluZyhpbnN0YW5jZS5fdHlwZSk7XG4gICAgICBhc3NlcnQuZXF1YWwoaW5zdGFuY2UuX3R5cGUsICdSZWx1dGlvbi5saXZlZGF0YS5Nb2RlbCcpO1xuICAgIH0pLFxuXG4gICAgaXQoJ2NyZWF0aW5nIG1vZGVsJywgZnVuY3Rpb24gKCkge1xuICAgICAgYXNzZXJ0LnR5cGVPZihNb2RlbCwgJ2Z1bmN0aW9uJywgJ01vZGVsIGlzIGRlZmluZWQuJyk7XG4gICAgICBjbGFzcyBQZXJzb24gZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XG4gICAgICAgIGlkQXR0cmlidXRlOiAnaWQnLFxuICAgICAgICBkZWZhdWx0czoge1xuICAgICAgICAgIGJtaTogMC4wXG4gICAgICAgIH0sXG4gICAgICAgIGVudGl0eTogJ3BlcnNvbicsXG5cbiAgICAgIH0pIHt9O1xuICAgICAgYXNzZXJ0LnR5cGVPZihQZXJzb24sICdmdW5jdGlvbicsICdwZXJzb24gbW9kZWwgY291bGQgYmUgZXh0ZW5kZWQuJyk7XG4gICAgICBhc3NlcnQudHlwZU9mKG5ldyBQZXJzb24oKSwgJ29iamVjdCcsICdlbXB0eSBwZXJzb24gbW9kZWwgY291bGQgYmUgY3JlYXRlZC4nKTtcblxuICAgICAgdmFyIHAgPSBuZXcgUGVyc29uKHtcbiAgICAgICAgZmlyc3ROYW1lOiAnTWF4JyxcbiAgICAgICAgc3VyZU5hbWU6ICdNdXN0ZXJtYW5uJyxcbiAgICAgICAgbm90ZXM6ICdOb3RlcyB0byB0aGlzIHBlcnNvbicsXG4gICAgICAgIGFkZHJlc3M6IHtzdHJlZXQ6ICdMZWl0enN0cmHDn2UnLCBob3VzZV9ucjogNDUsIHppcDogJzcwNDY5JywgY2l0eTogJ1N0dXR0Z2FydCd9XG4gICAgICB9KTtcbiAgICAgIGFzc2VydC5vayh0eXBlb2YgcCA9PT0gJ29iamVjdCcsICdwZXJzb24gcmVjb3JkIGNvdWxkIGJlIGNyZWF0ZWQuJyk7XG4gICAgICBhc3NlcnQub2socC5nZXQoJ2ZpcnN0TmFtZScpID09PSAnTWF4JywgJ0ZpZWxkIFwiZmlyc3ROYW1lXCIgaXMgc2V0LicpO1xuICAgICAgYXNzZXJ0Lm9rKHAuZ2V0KCdzdXJlTmFtZScpID09PSAnTXVzdGVybWFubicsICdGaWVsZCBcInN1cmVOYW1lXCIgaXMgc2V0LicpO1xuICAgICAgYXNzZXJ0Lm9rKHAuZ2V0KCdibWknKSA9PT0gMC4wLCAnRmllbGQgXCJibWlcIiBoYXMgY29ycmVjdCBkZWZhdWx0IHZhbHVlLicpO1xuICAgICAgYXNzZXJ0Lm9rKHAuZ2V0KCdub3RlcycpID09PSAnTm90ZXMgdG8gdGhpcyBwZXJzb24nLCAnRmllbGQgXCJub3RlXCIgaGFzIGNvcnJlY3QgdmFsdWUuJyk7XG4gICAgICBhc3NlcnQub2sodHlwZW9mIHAuZ2V0KCdpZCcpID09PSAndW5kZWZpbmVkJywgJ0ZpZWxkIFwiaWRcIiBpcyB1bmRlZmluZWQsIGFzIGV4cGVjdGVkLicpO1xuICAgICAgYXNzZXJ0Lm9rKHAuZ2V0KCdhZGRyZXNzJykuc3RyZWV0ID09PSAnTGVpdHpzdHJhw59lJywgJ0ZpZWxkIFwiYWRkcmVzc1wiIGhhcyBjb3JyZWN0IHZhbHVlLicpO1xuICAgIH0pXG5cbiAgXTtcbn0pO1xuIl19