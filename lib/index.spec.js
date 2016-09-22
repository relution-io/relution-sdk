/*
 * @file index.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.04.2016
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = [
    // core
    require('./core/mocha.spec'),
    require('./core/q.spec'),
    require('./core/diag.spec'),
    require('./core/init.spec'),
    require('./core/cipher.spec'),
    // security
    require('./security/server.spec'),
    // web
    require('./web/http.spec'),
    require('./web/urls.spec'),
    require('./web/offline.spec'),
    // model
    // query
    require('./query/JsonFilterVisitor.spec'),
    require('./query/SortOrderComparator.spec'),
    // push
    // connector
    // livedata
    require('./livedata/Model.spec'),
    require('./livedata/Collection.spec'),
    require('./livedata/Store.spec'),
    require('./livedata/WebSqlStore.spec'),
    require('./livedata/SyncEndpoint.spec'),
    require('./livedata/SyncStore.spec'),
    require('./livedata/SyncStore-offline.spec'),
    require('./livedata/SyncStore-sync-model-to-server.spec'),
    require('./livedata/SyncContext.spec')
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBR047a0JBQWU7SUFDYixPQUFPO0lBQ1AsT0FBTyxDQUFDLG1CQUFtQixDQUFDO0lBQzVCLE9BQU8sQ0FBQyxlQUFlLENBQUM7SUFDeEIsT0FBTyxDQUFDLGtCQUFrQixDQUFDO0lBQzNCLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztJQUMzQixPQUFPLENBQUMsb0JBQW9CLENBQUM7SUFFN0IsV0FBVztJQUNYLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQztJQUVqQyxNQUFNO0lBQ04sT0FBTyxDQUFDLGlCQUFpQixDQUFDO0lBQzFCLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztJQUMxQixPQUFPLENBQUMsb0JBQW9CLENBQUM7SUFFN0IsUUFBUTtJQUVSLFFBQVE7SUFDUixPQUFPLENBQUMsZ0NBQWdDLENBQUM7SUFDekMsT0FBTyxDQUFDLGtDQUFrQyxDQUFDO0lBRTNDLE9BQU87SUFFUCxZQUFZO0lBRVosV0FBVztJQUNYLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQztJQUNoQyxPQUFPLENBQUMsNEJBQTRCLENBQUM7SUFDckMsT0FBTyxDQUFDLHVCQUF1QixDQUFDO0lBQ2hDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQztJQUN0QyxPQUFPLENBQUMsOEJBQThCLENBQUM7SUFDdkMsT0FBTyxDQUFDLDJCQUEyQixDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQztJQUM1QyxPQUFPLENBQUMsZ0RBQWdELENBQUM7SUFDekQsT0FBTyxDQUFDLDZCQUE2QixDQUFDO0NBQ3ZDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgaW5kZXgudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI4LjA0LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBSZWx1dGlvblxuICovXG4vKiogKi9cblxuLy8gZm9sbG93aW5nIG11c3QgYmUgbGlzdGVkIGV4cGxpY2l0bHkgYXMgYnJvd3NlcmlmeSB3YWxrcyB0aGUgQVNULi4uXG5leHBvcnQgZGVmYXVsdCBbXG4gIC8vIGNvcmVcbiAgcmVxdWlyZSgnLi9jb3JlL21vY2hhLnNwZWMnKSxcbiAgcmVxdWlyZSgnLi9jb3JlL3Euc3BlYycpLFxuICByZXF1aXJlKCcuL2NvcmUvZGlhZy5zcGVjJyksXG4gIHJlcXVpcmUoJy4vY29yZS9pbml0LnNwZWMnKSxcbiAgcmVxdWlyZSgnLi9jb3JlL2NpcGhlci5zcGVjJyksXG5cbiAgLy8gc2VjdXJpdHlcbiAgcmVxdWlyZSgnLi9zZWN1cml0eS9zZXJ2ZXIuc3BlYycpLFxuXG4gIC8vIHdlYlxuICByZXF1aXJlKCcuL3dlYi9odHRwLnNwZWMnKSxcbiAgcmVxdWlyZSgnLi93ZWIvdXJscy5zcGVjJyksXG4gIHJlcXVpcmUoJy4vd2ViL29mZmxpbmUuc3BlYycpLFxuXG4gIC8vIG1vZGVsXG5cbiAgLy8gcXVlcnlcbiAgcmVxdWlyZSgnLi9xdWVyeS9Kc29uRmlsdGVyVmlzaXRvci5zcGVjJyksXG4gIHJlcXVpcmUoJy4vcXVlcnkvU29ydE9yZGVyQ29tcGFyYXRvci5zcGVjJyksXG5cbiAgLy8gcHVzaFxuXG4gIC8vIGNvbm5lY3RvclxuXG4gIC8vIGxpdmVkYXRhXG4gIHJlcXVpcmUoJy4vbGl2ZWRhdGEvTW9kZWwuc3BlYycpLFxuICByZXF1aXJlKCcuL2xpdmVkYXRhL0NvbGxlY3Rpb24uc3BlYycpLFxuICByZXF1aXJlKCcuL2xpdmVkYXRhL1N0b3JlLnNwZWMnKSxcbiAgcmVxdWlyZSgnLi9saXZlZGF0YS9XZWJTcWxTdG9yZS5zcGVjJyksXG4gIHJlcXVpcmUoJy4vbGl2ZWRhdGEvU3luY0VuZHBvaW50LnNwZWMnKSxcbiAgcmVxdWlyZSgnLi9saXZlZGF0YS9TeW5jU3RvcmUuc3BlYycpLFxuICByZXF1aXJlKCcuL2xpdmVkYXRhL1N5bmNTdG9yZS1vZmZsaW5lLnNwZWMnKSxcbiAgcmVxdWlyZSgnLi9saXZlZGF0YS9TeW5jU3RvcmUtc3luYy1tb2RlbC10by1zZXJ2ZXIuc3BlYycpLFxuICByZXF1aXJlKCcuL2xpdmVkYXRhL1N5bmNDb250ZXh0LnNwZWMnKVxuXTtcbiJdfQ==