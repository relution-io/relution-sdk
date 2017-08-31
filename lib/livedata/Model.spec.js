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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9kZWwuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9Nb2RlbC5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFFNUIsc0JBQTZCLFNBQVMsQ0FBQyxDQUFBO0FBQ3ZDLDJCQUF5QixjQUFjLENBQUMsQ0FBQTtBQUN4QyxzQkFBb0IsU0FBUyxDQUFDLENBQUE7QUFFOUIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksVUFBVSxFQUFFO0lBQ3RDLE1BQU0sQ0FBQztRQUVMLEVBQUUsQ0FBQyxTQUFTLEVBQUU7WUFDWixhQUFNLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ25DLGFBQU0sQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDOUIsYUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1QixhQUFNLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNCLGFBQU0sQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsYUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1QixhQUFNLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVCLGFBQU0sQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLGFBQUssQ0FBQyxDQUFDLENBQUM7WUFDL0IsYUFBTSxDQUFDLE1BQU0sQ0FBQyxlQUFPLENBQUMsSUFBSSxhQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDcEMsYUFBTSxD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Q0FBQyxLQUFLLFdBQVcsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO1lBQ3ZGLGFBQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEtBQUssYUFBYSxFQUFFLG9DQUFvQyxDQUFDLENBQUM7UUFDN0YsQ0FBQyxDQUFDO0tBRUgsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogQGZpbGUgbGl2ZWRhdGEvTW9kZWwuc3BlYy50c1xyXG4gKiBSZWx1dGlvbiBTREtcclxuICpcclxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMjguMDYuMjAxNlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcclxuICovXHJcbi8qKiAqL1xyXG5cclxuaW1wb3J0IHthc3NlcnR9IGZyb20gJ2NoYWknO1xyXG5cclxuaW1wb3J0IHtNb2RlbCwgaXNNb2RlbH0gZnJvbSAnLi9Nb2RlbCc7XHJcbmltcG9ydCB7Q29sbGVjdGlvbn0gZnJvbSAnLi9Db2xsZWN0aW9uJztcclxuaW1wb3J0IHtTdG9yZX0gZnJvbSAnLi9TdG9yZSc7XHJcblxyXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIFtcclxuXHJcbiAgICBpdCgnaXNNb2RlbCcsICgpID0+IHtcclxuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNNb2RlbCh1bmRlZmluZWQpKTtcclxuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNNb2RlbChudWxsKSk7XHJcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwoJycpKTtcclxuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNNb2RlbCgwKSk7XHJcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwoMSkpO1xyXG4gICAgICBhc3NlcnQuaXNGYWxzZShpc01vZGVsKHt9KSk7XHJcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwoW10pKTtcclxuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNNb2RlbChNb2RlbCkpO1xyXG4gICAgICBhc3NlcnQuaXNUcnVlKGlzTW9kZWwobmV3IE1vZGVsKCkpKTtcclxuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNNb2RlbChDb2xsZWN0aW9uKSk7XHJcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwobmV3IENvbGxlY3Rpb24oKSkpO1xyXG4gICAgICBhc3NlcnQuaXNGYWxzZShpc01vZGVsKFN0b3JlKSk7XHJcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwobmV3IFN0b3JlKCkpKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdiYXNpYycsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgYXNzZXJ0LmlzRGVmaW5lZChNb2RlbCk7XHJcbiAgICAgIGFzc2VydC5pc0Z1bmN0aW9uKE1vZGVsKTtcclxuXHJcbiAgICAgIHZhciBpbnN0YW5jZSA9IG5ldyBNb2RlbCgpO1xyXG4gICAgICBhc3NlcnQuaXNEZWZpbmVkKGluc3RhbmNlKTtcclxuICAgICAgYXNzZXJ0LmlzT2JqZWN0KGluc3RhbmNlKTtcclxuICAgICAgYXNzZXJ0LmlzRGVmaW5lZChpbnN0YW5jZS5fdHlwZSk7XHJcbiAgICAgIGFzc2VydC5pc1N0cmluZyhpbnN0YW5jZS5fdHlwZSk7XHJcbiAgICAgIGFzc2VydC5lcXVhbChpbnN0YW5jZS5fdHlwZSwgJ1JlbHV0aW9uLmxpdmVkYXRhLk1vZGVsJyk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnY3JlYXRpbmcgbW9kZWwnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGFzc2VydC50eXBlT2YoTW9kZWwsICdmdW5jdGlvbicsICdNb2RlbCBpcyBkZWZpbmVkLicpO1xyXG4gICAgICBjbGFzcyBQZXJzb24gZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XHJcbiAgICAgICAgaWRBdHRyaWJ1dGU6ICdpZCcsXHJcbiAgICAgICAgZGVmYXVsdHM6IHtcclxuICAgICAgICAgIGJtaTogMC4wXHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbnRpdHk6ICdwZXJzb24nLFxyXG5cclxuICAgICAgfSkge307XHJcbiAgICAgIGFzc2VydC50eXBlT2YoUGVyc29uLCAnZnVuY3Rpb24nLCAncGVyc29uIG1vZGVsIGNvdWxkIGJlIGV4dGVuZGVkLicpO1xyXG4gICAgICBhc3NlcnQudHlwZU9mKG5ldyBQZXJzb24oKSwgJ29iamVjdCcsICdlbXB0eSBwZXJzb24gbW9kZWwgY291bGQgYmUgY3JlYXRlZC4nKTtcclxuXHJcbiAgICAgIHZhciBwID0gbmV3IFBlcnNvbih7XHJcbiAgICAgICAgZmlyc3ROYW1lOiAnTWF4JyxcclxuICAgICAgICBzdXJlTmFtZTogJ011c3Rlcm1hbm4nLFxyXG4gICAgICAgIG5vdGVzOiAnTm90ZXMgdG8gdGhpcyBwZXJzb24nLFxyXG4gICAgICAgIGFkZHJlc3M6IHtzdHJlZXQ6ICdMZWl0enN0cmHDn2UnLCBob3VzZV9ucjogNDUsIHppcDogJzcwNDY5JywgY2l0eTogJ1N0dXR0Z2FydCd9XHJcbiAgICAgIH0pO1xyXG4gICAgICBhc3NlcnQub2sodHlwZW9mIHAgPT09ICdvYmplY3QnLCAncGVyc29uIHJlY29yZCBjb3VsZCBiZSBjcmVhdGVkLicpO1xyXG4gICAgICBhc3NlcnQub2socC5nZXQoJ2ZpcnN0TmFtZScpID09PSAnTWF4JywgJ0ZpZWxkIFwiZmlyc3ROYW1lXCIgaXMgc2V0LicpO1xyXG4gICAgICBhc3NlcnQub2socC5nZXQoJ3N1cmVOYW1lJykgPT09ICdNdXN0ZXJtYW5uJywgJ0ZpZWxkIFwic3VyZU5hbWVcIiBpcyBzZXQuJyk7XHJcbiAgICAgIGFzc2VydC5vayhwLmdldCgnYm1pJykgPT09IDAuMCwgJ0ZpZWxkIFwiYm1pXCIgaGFzIGNvcnJlY3QgZGVmYXVsdCB2YWx1ZS4nKTtcclxuICAgICAgYXNzZXJ0Lm9rKHAuZ2V0KCdub3RlcycpID09PSAnTm90ZXMgdG8gdGhpcyBwZXJzb24nLCAnRmllbGQgXCJub3RlXCIgaGFzIGNvcnJlY3QgdmFsdWUuJyk7XHJcbiAgICAgIGFzc2VydC5vayh0eXBlb2YgcC5nZXQoJ2lkJykgPT09ICd1bmRlZmluZWQnLCAnRmllbGQgXCJpZFwiIGlzIHVuZGVmaW5lZCwgYXMgZXhwZWN0ZWQuJyk7XHJcbiAgICAgIGFzc2VydC5vayhwLmdldCgnYWRkcmVzcycpLnN0cmVldCA9PT0gJ0xlaXR6c3RyYcOfZScsICdGaWVsZCBcImFkZHJlc3NcIiBoYXMgY29ycmVjdCB2YWx1ZS4nKTtcclxuICAgIH0pXHJcblxyXG4gIF07XHJcbn0pO1xyXG4iXX0=