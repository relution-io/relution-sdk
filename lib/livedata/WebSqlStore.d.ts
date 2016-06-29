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
