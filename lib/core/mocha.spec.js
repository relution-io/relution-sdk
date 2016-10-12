/*
 * @file core/mocha.spec.ts
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
 * @module core
 */
/** */
"use strict";
var chai_1 = require('chai');
describe(module.filename || __filename, function () {
    return [
        it('assert samples', function () {
            var x = {};
            // assert.valueOf(x, 'object', 'x is an object.');
            chai_1.assert.isObject(x, 'x is an object.');
            chai_1.assert.ok(1 !== 2, '1 is not 2');
            chai_1.assert.equal(-1, [1, 2, 3].indexOf(5));
            chai_1.assert.equal(-1, [1, 2, 3].indexOf(0));
        }),
        it('expect samples', function () {
            var foo = 'bar';
            var beverages = { tea: ['chai', 'matcha', 'oolong'] };
            chai_1.expect(foo).to.be.a('string');
            chai_1.expect(foo).to.equal('bar');
            chai_1.expect(foo).to.have.length(3);
            chai_1.expect(beverages).to.have.property('tea').with.length(3);
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jaGEuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb3JlL21vY2hhLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFFTixxQkFBNkIsTUFBTSxDQUFDLENBQUE7QUFFcEMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksVUFBVSxFQUFFO0lBQ3RDLE1BQU0sQ0FBQztRQUVMLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRTtZQUNuQixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDWCxrREFBa0Q7WUFDbEQsYUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztZQUN0QyxhQUFNLENBQUMsRUFBRSxDQUFTLENBQUMsS0FBYSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDakQsYUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkMsYUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFDO1FBRUYsRUFBRSxDQUFDLGdCQUFnQixFQUFFO1lBQ25CLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQTtZQUNmLElBQUksU0FBUyxHQUFHLEVBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBQyxDQUFDO1lBQ3BELGFBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM5QixhQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QixhQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUIsYUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsQ0FBQyxDQUFDO0tBRUgsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIGNvcmUvbW9jaGEuc3BlYy50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMjguMDYuMjAxNlxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIGNvcmVcbiAqL1xuLyoqICovXG5cbmltcG9ydCB7YXNzZXJ0LCBleHBlY3R9IGZyb20gJ2NoYWknO1xuXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBbXG5cbiAgICBpdCgnYXNzZXJ0IHNhbXBsZXMnLCAoKSA9PiB7XG4gICAgICB2YXIgeCA9IHt9O1xuICAgICAgLy8gYXNzZXJ0LnZhbHVlT2YoeCwgJ29iamVjdCcsICd4IGlzIGFuIG9iamVjdC4nKTtcbiAgICAgIGFzc2VydC5pc09iamVjdCh4LCAneCBpcyBhbiBvYmplY3QuJyk7XG4gICAgICBhc3NlcnQub2soPG51bWJlcj4xICE9PSA8bnVtYmVyPjIsICcxIGlzIG5vdCAyJyk7XG4gICAgICBhc3NlcnQuZXF1YWwoLTEsIFsxLCAyLCAzXS5pbmRleE9mKDUpKTtcbiAgICAgIGFzc2VydC5lcXVhbCgtMSwgWzEsIDIsIDNdLmluZGV4T2YoMCkpO1xuICAgIH0pLFxuXG4gICAgaXQoJ2V4cGVjdCBzYW1wbGVzJywgKCkgPT4ge1xuICAgICAgdmFyIGZvbyA9ICdiYXInXG4gICAgICB2YXIgYmV2ZXJhZ2VzID0ge3RlYTogWydjaGFpJywgJ21hdGNoYScsICdvb2xvbmcnXX07XG4gICAgICBleHBlY3QoZm9vKS50by5iZS5hKCdzdHJpbmcnKTtcbiAgICAgIGV4cGVjdChmb28pLnRvLmVxdWFsKCdiYXInKTtcbiAgICAgIGV4cGVjdChmb28pLnRvLmhhdmUubGVuZ3RoKDMpO1xuICAgICAgZXhwZWN0KGJldmVyYWdlcykudG8uaGF2ZS5wcm9wZXJ0eSgndGVhJykud2l0aC5sZW5ndGgoMyk7XG4gICAgfSlcblxuICBdO1xufSk7XG4iXX0=