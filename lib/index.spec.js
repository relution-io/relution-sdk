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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBR047a0JBQWU7SUFDYixPQUFPO0lBQ1AsT0FBTyxDQUFDLG1CQUFtQixDQUFDO0lBQzVCLE9BQU8sQ0FBQyxlQUFlLENBQUM7SUFDeEIsT0FBTyxDQUFDLGtCQUFrQixDQUFDO0lBQzNCLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztJQUMzQixPQUFPLENBQUMsb0JBQW9CLENBQUM7SUFFN0IsV0FBVztJQUNYLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQztJQUVqQyxNQUFNO0lBQ04sT0FBTyxDQUFDLGlCQUFpQixDQUFDO0lBQzFCLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztJQUMxQixPQUFPLENBQUMsbUJBQW1CLENBQUM7SUFDNUIsT0FBTyxDQUFDLG9CQUFvQixDQUFDO0lBRTdCLFFBQVE7SUFFUixRQUFRO0lBQ1IsT0FBTyxDQUFDLGdDQUFnQyxDQUFDO0lBQ3pDLE9BQU8sQ0FBQyxrQ0FBa0MsQ0FBQztJQUUzQyxPQUFPO0lBRVAsWUFBWTtJQUVaLFdBQVc7SUFDWCxPQUFPLENBQUMsdUJBQXVCLENBQUM7SUFDaEMsT0FBTyxDQUFDLDRCQUE0QixDQUFDO0lBQ3JDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQztJQUNoQyxPQUFPLENBQUMsNkJBQTZCLENBQUM7SUFDdEMsT0FBTyxDQUFDLDhCQUE4QixDQUFDO0lBQ3ZDLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQztJQUNwQyxPQUFPLENBQUMsbUNBQW1DLENBQUM7SUFDNUMsT0FBTyxDQUFDLGdEQUFnRCxDQUFDO0lBQ3pELE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQztDQUN2QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIGluZGV4LnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyOC4wNC4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgUmVsdXRpb25cbiAqL1xuLyoqICovXG5cbi8vIGZvbGxvd2luZyBtdXN0IGJlIGxpc3RlZCBleHBsaWNpdGx5IGFzIGJyb3dzZXJpZnkgd2Fsa3MgdGhlIEFTVC4uLlxuZXhwb3J0IGRlZmF1bHQgW1xuICAvLyBjb3JlXG4gIHJlcXVpcmUoJy4vY29yZS9tb2NoYS5zcGVjJyksXG4gIHJlcXVpcmUoJy4vY29yZS9xLnNwZWMnKSxcbiAgcmVxdWlyZSgnLi9jb3JlL2RpYWcuc3BlYycpLFxuICByZXF1aXJlKCcuL2NvcmUvaW5pdC5zcGVjJyksXG4gIHJlcXVpcmUoJy4vY29yZS9jaXBoZXIuc3BlYycpLFxuXG4gIC8vIHNlY3VyaXR5XG4gIHJlcXVpcmUoJy4vc2VjdXJpdHkvc2VydmVyLnNwZWMnKSxcblxuICAvLyB3ZWJcbiAgcmVxdWlyZSgnLi93ZWIvaHR0cC5zcGVjJyksXG4gIHJlcXVpcmUoJy4vd2ViL3VybHMuc3BlYycpLFxuICByZXF1aXJlKCcuL3dlYi9vbmxpbmUuc3BlYycpLFxuICByZXF1aXJlKCcuL3dlYi9vZmZsaW5lLnNwZWMnKSxcblxuICAvLyBtb2RlbFxuXG4gIC8vIHF1ZXJ5XG4gIHJlcXVpcmUoJy4vcXVlcnkvSnNvbkZpbHRlclZpc2l0b3Iuc3BlYycpLFxuICByZXF1aXJlKCcuL3F1ZXJ5L1NvcnRPcmRlckNvbXBhcmF0b3Iuc3BlYycpLFxuXG4gIC8vIHB1c2hcblxuICAvLyBjb25uZWN0b3JcblxuICAvLyBsaXZlZGF0YVxuICByZXF1aXJlKCcuL2xpdmVkYXRhL01vZGVsLnNwZWMnKSxcbiAgcmVxdWlyZSgnLi9saXZlZGF0YS9Db2xsZWN0aW9uLnNwZWMnKSxcbiAgcmVxdWlyZSgnLi9saXZlZGF0YS9TdG9yZS5zcGVjJyksXG4gIHJlcXVpcmUoJy4vbGl2ZWRhdGEvV2ViU3FsU3RvcmUuc3BlYycpLFxuICByZXF1aXJlKCcuL2xpdmVkYXRhL1N5bmNFbmRwb2ludC5zcGVjJyksXG4gIHJlcXVpcmUoJy4vbGl2ZWRhdGEvU3luY1N0b3JlLnNwZWMnKSxcbiAgcmVxdWlyZSgnLi9saXZlZGF0YS9TeW5jU3RvcmUtb2ZmbGluZS5zcGVjJyksXG4gIHJlcXVpcmUoJy4vbGl2ZWRhdGEvU3luY1N0b3JlLXN5bmMtbW9kZWwtdG8tc2VydmVyLnNwZWMnKSxcbiAgcmVxdWlyZSgnLi9saXZlZGF0YS9TeW5jQ29udGV4dC5zcGVjJylcbl07XG4iXX0=