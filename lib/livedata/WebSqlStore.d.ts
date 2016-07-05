import * as Q from 'q';
import { Store } from './Store';
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
    protected db: any;
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
