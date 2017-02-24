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
    require('./web/online.spec'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBR047a0JBQWU7SUFDYixPQUFPO0lBQ1AsT0FBTyxDQUFDLG1CQUFtQixDQUFDO0lBQzVCLE9BQU8sQ0FBQyxlQUFlLENBQUM7SUFDeEIsT0FBTyxDQUFDLGtCQUFrQixDQUFDO0lBQzNCLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztJQUMzQixPQUFPLENBQUMsb0JBQW9CLENBQUM7SUFFN0IsV0FBVztJQUNYLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQztJQUVqQyxNQUFNO0lBQ04sT0FBTyxDQUFDLGlCQUFpQixDQUFDO0lBQzFCLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztJQUMxQixPQUFPLENBQUMsbUJBQW1CLENBQUM7SUFDNUIsT0FBTyxDQUFDLG9CQUFvQixDQUFDO0lBRTdCLFFBQVE7SUFFUixRQUFRO0lBQ1IsT0FBTyxDQUFDLGdDQUFnQyxDQUFDO0lBQ3pDLE9BQU8sQ0FBQyxrQ0FBa0MsQ0FBQztJQUUzQyxPQUFPO0lBRVAsWUFBWTtJQUVaLFdBQVc7SUFDWCxPQUFPLENBQUMsdUJBQXVCLENBQUM7SUFDaEMsT0FBTyxDQUFDLDRCQUE0QixDQUFDO0lBQ3JDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQztJQUNoQyxPQUFPLENBQUMsNkJBQTZCLENBQUM7SUFDdEMsT0FBTyxDQUFDLDhCQUE4QixDQUFDO0lBQ3ZDLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQztJQUNwQyxPQUFPLENBQUMsbUNBQW1DLENBQUM7SUFDNUMsT0FBTyxDQUFDLGdEQUFnRCxDQUFDO0lBQ3pELE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQztDQUN2QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogQGZpbGUgaW5kZXgudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI4LjA0LjIwMTZcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIFJlbHV0aW9uXHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbi8vIGZvbGxvd2luZyBtdXN0IGJlIGxpc3RlZCBleHBsaWNpdGx5IGFzIGJyb3dzZXJpZnkgd2Fsa3MgdGhlIEFTVC4uLlxyXG5leHBvcnQgZGVmYXVsdCBbXHJcbiAgLy8gY29yZVxyXG4gIHJlcXVpcmUoJy4vY29yZS9tb2NoYS5zcGVjJyksXHJcbiAgcmVxdWlyZSgnLi9jb3JlL3Euc3BlYycpLFxyXG4gIHJlcXVpcmUoJy4vY29yZS9kaWFnLnNwZWMnKSxcclxuICByZXF1aXJlKCcuL2NvcmUvaW5pdC5zcGVjJyksXHJcbiAgcmVxdWlyZSgnLi9jb3JlL2NpcGhlci5zcGVjJyksXHJcblxyXG4gIC8vIHNlY3VyaXR5XHJcbiAgcmVxdWlyZSgnLi9zZWN1cml0eS9zZXJ2ZXIuc3BlYycpLFxyXG5cclxuICAvLyB3ZWJcclxuICByZXF1aXJlKCcuL3dlYi9odHRwLnNwZWMnKSxcclxuICByZXF1aXJlKCcuL3dlYi91cmxzLnNwZWMnKSxcclxuICByZXF1aXJlKCcuL3dlYi9vbmxpbmUuc3BlYycpLFxyXG4gIHJlcXVpcmUoJy4vd2ViL29mZmxpbmUuc3BlYycpLFxyXG5cclxuICAvLyBtb2RlbFxyXG5cclxuICAvLyBxdWVyeVxyXG4gIHJlcXVpcmUoJy4vcXVlcnkvSnNvbkZpbHRlclZpc2l0b3Iuc3BlYycpLFxyXG4gIHJlcXVpcmUoJy4vcXVlcnkvU29ydE9yZGVyQ29tcGFyYXRvci5zcGVjJyksXHJcblxyXG4gIC8vIHB1c2hcclxuXHJcbiAgLy8gY29ubmVjdG9yXHJcblxyXG4gIC8vIGxpdmVkYXRhXHJcbiAgcmVxdWlyZSgnLi9saXZlZGF0YS9Nb2RlbC5zcGVjJyksXHJcbiAgcmVxdWlyZSgnLi9saXZlZGF0YS9Db2xsZWN0aW9uLnNwZWMnKSxcclxuICByZXF1aXJlKCcuL2xpdmVkYXRhL1N0b3JlLnNwZWMnKSxcclxuICByZXF1aXJlKCcuL2xpdmVkYXRhL1dlYlNxbFN0b3JlLnNwZWMnKSxcclxuICByZXF1aXJlKCcuL2xpdmVkYXRhL1N5bmNFbmRwb2ludC5zcGVjJyksXHJcbiAgcmVxdWlyZSgnLi9saXZlZGF0YS9TeW5jU3RvcmUuc3BlYycpLFxyXG4gIHJlcXVpcmUoJy4vbGl2ZWRhdGEvU3luY1N0b3JlLW9mZmxpbmUuc3BlYycpLFxyXG4gIHJlcXVpcmUoJy4vbGl2ZWRhdGEvU3luY1N0b3JlLXN5bmMtbW9kZWwtdG8tc2VydmVyLnNwZWMnKSxcclxuICByZXF1aXJlKCcuL2xpdmVkYXRhL1N5bmNDb250ZXh0LnNwZWMnKVxyXG5dO1xyXG4iXX0=