/**
 * @file livedata/AbstractSqlStore.ts
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
import { Store } from './Store';
/**
 * stores LiveData into the WebSQL database.
 */
export declare class AbstractSqlStore extends Store {
    protected size: number;
    protected version: string;
    protected db: any;
    protected entities: {
        [entity: string]: {
            table: string;
            created?: boolean;
        };
    };
    constructor(options?: any);
    sync(method: any, model: any, options: any): Q.Promise<{}>;
    protected select(options: any): void;
    protected drop(options: any): void;
    protected createTable(options: any): void;
    protected execute(options: any): void;
    protected _sqlUpdateDatabase(oldVersion: any, newVersion: any): any[];
    protected _sqlDropTable(entity: any): string;
    protected _sqlCreateTable(entity: any): string;
    protected _sqlDelete(options: any, entity: any): string;
    protected _sqlWhereFromData(options: any, entity: any): string;
    protected _sqlSelect(options: any, entity: any): string;
    protected _sqlValue(value: any): string;
    protected _dropTable(options: any): void;
    protected _createTable(options: any): void;
    protected _checkTable(options: any, callback: any): void;
    protected _insertOrReplace(model: any, options: any): void;
    protected _select(model: any, options: any): void;
    protected _delete(model: any, options: any): void;
    protected _executeSql(options: any): void;
    private transactionPromise;
    protected _executeTransaction(options: any, statements: any, result?: any): void;
    protected _checkDb(options: any): boolean;
}
