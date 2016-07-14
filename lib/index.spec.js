/**
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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = [
    // core
    require('./core/mocha.spec'),
    require('./core/q.spec'),
    require('./core/diag.spec'),
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
//# sourceMappingURL=index.spec.js.map