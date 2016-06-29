import * as Q from 'q';
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
