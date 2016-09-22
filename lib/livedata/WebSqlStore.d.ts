/// <reference types="node" />
/// <reference types="websql" />
/// <reference types="q" />
import * as Q from 'q';
import { Store } from './Store';
import { Model } from './Model';
import { Collection } from './Collection';
export interface WebSqlOptions {
    name: string;
    description?: string;
    version?: string;
    size?: number;
    location?: number;
    key?: string;
    security?: string;
    credentials?: any;
}
export interface Statement {
    statement: string;
    arguments: any[];
}
export interface WebSqlError extends Error {
    /**
     * eventually contains last recently executed SQL causing the error.
     */
    sql?: string;
}
/**
 * stores LiveData into the WebSQL database.
 *
 * @example
 *
 * // The default configuration will save the complete model data as json
 * // into a database column with the name "data"
 * class MyCollection extends Relution.livedata.Collection {};
 * MyCollection.prototype.model = MyModel;
 * MyCollection.prototype.entity = 'MyTableName';
 * MyCollection.prototype.store = new Relution.livedata.WebSqlStore();
 *
 * // If you want to use specific columns you can specify the fields
 * // in the entity of your model like this:
 * class MyModel extends Relution.livedata.Model {};
 * MyModel.prototype.idAttribute = 'id';
 */
export declare class WebSqlStore extends Store {
    protected size: number;
    protected version: string;
    protected db: Database;
    protected entities: {
        [entity: string]: {
            table: string;
            created?: boolean;
        };
    };
    constructor(options?: any);
    /**
     * closes the database.
     */
    close(): void;
    /**
     * @private
     */
    private _openDb(options);
    private _updateDb(options);
    sync(method: string, model: Model | Collection, options?: any): Q.Promise<any>;
    protected select(options: any): void;
    protected drop(options: any): void;
    protected createTable(options: any): void;
    protected execute(options: any): void;
    protected _sqlUpdateDatabase(oldVersion: string | DOMString, newVersion: string): string[];
    protected _sqlDropTable(entity: string): string;
    protected _sqlCreateTable(entity: string): string;
    protected _sqlDelete(options: any, entity: string): string;
    protected _sqlWhereFromData(options: any, entity: string): string;
    protected _sqlSelect(options: any, entity: string): string;
    protected _sqlValue(value: any): string;
    protected _dropTable(options: any): void;
    protected _createTable(options: any): void;
    protected _checkTable(options: any, callback: Function): void;
    protected _insertOrReplace(model: Model | Collection, options: any): void;
    protected _select(model: Model | Collection, options: any): void;
    protected _delete(model: Model | Collection, options: any): void;
    protected _executeSql(options: any): void;
    private transactionPromise;
    protected _executeTransaction(options: any, statements: (Statement | string)[], result?: any): void;
    protected _checkDb(options: any): boolean;
    protected _checkData(options: any, data: Model[]): boolean;
}
