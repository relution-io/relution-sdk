/**
 * @file livedata/WebSqlStore.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 24.06.2015
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
import { AbstractSqlStore } from './AbstractSqlStore';
/**
 * stores LiveData into the WebSQL database.
 *
 * @example
 *
 * // The default configuration will save the complete model data as json
 * // into a database column with the name "data"
 * var MyCollection = Relution.livedata.Collection.extend({
 *      model: MyModel,
 *      entity: 'MyTableName',
 *      store: new Relution.livedata.WebSqlStore()
 * });
 *
 * // If you want to use specific columns you can specify the fields
 * // in the entity of your model like this:
 * var MyModel = Relution.livedata.Model.extend({
 *      idAttribute: 'id'
 * });
 */
export declare class WebSqlStore extends AbstractSqlStore {
    constructor(options?: any);
    /**
     * @private
     */
    private _openDb(options);
    private _updateDb(options);
    close(): void;
}
