/**
 * @file livedata/CipherSqlStore.ts
 * Relution SDK
 *
 * Created by Pascal Brewing on 04.11.2015
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
 *      store: new Relution.livedata.CipherSqlStore()
 * });
 *
 * // If you want to use specific columns you can specify the fields
 * // in the entity of your model like this:
 * var MyModel = Relution.livedata.Model.extend({
 *      idAttribute: 'id'
 * });
 * 0 (default): Documents - visible to iTunes and backed up by iCloud
 * 1: Library - backed up by iCloud, NOT visible to iTunes
 * 2: Library/LocalDatabase - NOT visible to iTunes and NOT backed up by iCloud
 */
export declare class CipherSqlStore extends AbstractSqlStore {
    protected security: string;
    constructor(options?: any);
    /**
     * The new location option is used to select the database subdirectory location (iOS only) with the following choices:
     *
     * 0 (default): Documents - visible to iTunes and backed up by iCloud
     * 1: Library - backed up by iCloud, NOT visible to iTunes
     * 2: Library/LocalDatabase - NOT visible to iTunes and NOT backed up by iCloud
     *
     * @private
     */
    private _openDb(errorCallback);
    private _updateDb(options);
}
