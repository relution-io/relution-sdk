/*
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
/**
 * @module livedata
 */
/** */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var Q = require('q');
var diag = require('../core/diag');
var objectid = require('../core/objectid');
var cipher = require('../core/cipher');
var Store_1 = require('./Store');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
/**
 * openDatabase of browser or via require websql.
 *
 * @internal Not public API, exported for testing purposes only!
 */
function openDatabase(options) {
    var db;
    var sqlitePlugin = 'sqlitePlugin';
    if (global[sqlitePlugin]) {
        // device implementation
        options = _.clone(options);
        if (!options.key) {
            if (options.security) {
                options.key = options.security;
                delete options.security;
            }
            else if (options.credentials) {
                options.key = cipher.hashJsonSync(options.credentials, 'sha256').toString('hex');
                delete options.credentials;
            }
        }
        if (!options.location) {
            options.location = 2;
        }
        db = global[sqlitePlugin].openDatabase(options);
    }
    else if (global['openDatabase']) {
        // native implementation
        db = global['openDatabase'](options.name, options.version || '', options.description || '', options.size || 1024 * 1024);
    }
    else if (process && !process['browser']) {
        // node.js implementation
        var websql = void 0;
        try {
            websql = require('websql');
        }
        catch (error) {
            diag.debug.warn(error);
        }
        if (websql) {
            db = websql(options.name, options.version || '', options.description || '', options.size || 1024 * 1024);
        }
    }
    if (!db) {
        // when this is reached no supported implementation is present
        throw new Error('WebSQL implementation is not available');
    }
    return db;
}
exports.openDatabase = openDatabase;
/**
 * matches char codes subject to https://issues.apache.org/jira/browse/CB-9435 Cordova iOS bug.
 */
var BAD_UNICODES = /[\u2028\u2029]/;
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
var WebSqlStore = (function (_super) {
    __extends(WebSqlStore, _super);
    function WebSqlStore(options) {
        var _this = this;
        _super.call(this, options);
        this.db = null;
        this.entities = {};
        this.transactionPromise = Q.resolve(null);
        if (options && options.entities) {
            for (var entity in options.entities) {
                this.entities[entity] = {
                    table: options.entities[entity] || entity
                };
            }
        }
        this._openDb(_.defaults({
            name: this.name,
            size: this.size,
            version: this.version,
            error: function (error) {
                diag.debug.error(error.message);
                _this.handleError(options, error);
                _this.trigger('error', error);
            }
        }, options));
    }
    /**
     * closes the database.
     */
    WebSqlStore.prototype.close = function () {
        diag.debug.info('Store close');
        if (this.db) {
            try {
                // some implementations offer a close() method
                if (this.db.close) {
                    this.db.close();
                }
            }
            finally {
                this.db = null;
            }
        }
    };
    /**
     * @private
     */
    WebSqlStore.prototype._openDb = function (options) {
        var error;
        if (!this.db) {
            try {
                this.db = openDatabase(options);
                if (this.entities) {
                    for (var entity in this.entities) {
                        this._createTable({
                            entity: entity
                        });
                    }
                }
            }
            catch (e) {
                error = e;
            }
        }
        if (this.db) {
            if (this.version && this.db.version !== this.version && this.db.changeVersion) {
                this._updateDb(options);
            }
            else {
                this.handleSuccess(options, this.db);
            }
        }
        else if (error === 2 || error === '2') {
            // Version number mismatch.
            this._updateDb(options);
        }
        else if (error) {
            if (!_.isError(error)) {
                error = new Error('' + error);
            }
            this.handleError(options, error);
        }
        else {
            this.handleSuccess(options, this.db);
        }
    };
    WebSqlStore.prototype._updateDb = function (options) {
        var error;
        var lastSql;
        var that = this;
        try {
            if (!this.db) {
                this.db = openDatabase(options);
            }
            try {
                var arSql = this._sqlUpdateDatabase(this.db.version, this.version);
                this.db.changeVersion(this.db.version, this.version, function (tx) {
                    _.each(arSql, function (sql) {
                        diag.debug.info('sql statement: ' + sql);
                        lastSql = sql;
                        tx.executeSql(sql);
                    });
                }, function (err) {
                    if (!lastSql && that.db.version === that.version) {
                        // not a real error, concurrent migration attempt completed already
                        that.handleSuccess(options, that.db);
                    }
                    else {
                        if (lastSql) {
                            err.sql = lastSql;
                        }
                        that.handleError(options, err);
                    }
                }, function () {
                    that.handleSuccess(options, that.db);
                });
            }
            catch (e) {
                error = e;
                diag.debug.error('webSql change version failed, DB-Version: ' + this.db.version);
            }
        }
        catch (e) {
            error = e;
        }
        if (error) {
            this.handleError(options, error);
        }
    };
    WebSqlStore.prototype.sync = function (method, model, options) {
        options = options || {};
        var that = this;
        var q = Q.defer();
        var opts = _.extend({
            entity: model.entity || options.entity
        }, options || {}, {
            success: function (response) {
                var result = that.handleSuccess(options, response) || response;
                q.resolve(result);
                return result;
            },
            error: function (error) {
                var result = that.handleError(options, error);
                if (result) {
                    q.resolve(result);
                    return result;
                }
                else {
                    q.reject(error);
                }
            }
        });
        switch (method) {
            case 'create':
                that._checkTable(opts, function () {
                    that._insertOrReplace(model, opts);
                });
                break;
            case 'update':
            case 'patch':
                that._checkTable(opts, function () {
                    that._insertOrReplace(model, opts);
                });
                break;
            case 'delete':
                that._checkTable(opts, function () {
                    that._delete(model, opts);
                });
                break;
            case 'read':
                that._checkTable(opts, function () {
                    that._select(model, opts);
                });
                break;
            default:
                break;
        }
        return q.promise;
    };
    WebSqlStore.prototype.select = function (options) {
        this._select(null, options);
    };
    WebSqlStore.prototype.drop = function (options) {
        this._dropTable(options);
    };
    WebSqlStore.prototype.createTable = function (options) {
        this._createTable(options);
    };
    WebSqlStore.prototype.execute = function (options) {
        this._executeSql(options);
    };
    WebSqlStore.prototype._sqlUpdateDatabase = function (oldVersion, newVersion) {
        // create sql array, simply drop and create the database
        var sql = [];
        for (var entity in this.entities) {
            sql.push(this._sqlDropTable(entity));
            sql.push(this._sqlCreateTable(entity));
        }
        return sql;
    };
    WebSqlStore.prototype._sqlDropTable = function (entity) {
        return "DROP TABLE IF EXISTS '" + this.entities[entity].table + "';";
    };
    WebSqlStore.prototype._sqlCreateTable = function (entity) {
        return "CREATE TABLE IF NOT EXISTS '" + this.entities[entity].table + "' (id VARCHAR(255) NOT NULL PRIMARY KEY ASC UNIQUE, data TEXT NOT NULL);";
    };
    WebSqlStore.prototype._sqlDelete = function (options, entity) {
        var sql = 'DELETE FROM \'' + this.entities[entity].table + '\'';
        var where = this._sqlWhereFromData(options, entity);
        if (where) {
            sql += ' WHERE ' + where;
        }
        else {
            diag.debug.assert(function () { return false; }, 'attempt of deletion without where clause');
        }
        sql += options.and ? ' AND ' + options.and : '';
        return sql;
    };
    WebSqlStore.prototype._sqlWhereFromData = function (options, entity) {
        if (options && options.models && entity) {
            var ids = [];
            var that = this;
            _.each(options.models, function (model) {
                if (!model.isNew()) {
                    ids.push(that._sqlValue(model.id));
                }
            });
            if (ids.length > 0) {
                return 'id IN (' + ids.join(',') + ')';
            }
        }
        return '';
    };
    WebSqlStore.prototype._sqlSelect = function (options, entity) {
        var sql = 'SELECT ';
        sql += '*';
        sql += ' FROM \'' + this.entities[entity].table + '\'';
        if (options.syncContext) {
            // new code must do stuff in JavaScript, not SQL
            return sql;
        }
        var where = this._sqlWhereFromData(options, entity);
        if (where) {
            sql += ' WHERE ' + where;
        }
        if (options.order) {
            sql += ' ORDER BY ' + options.order;
        }
        if (options.limit) {
            sql += ' LIMIT ' + options.limit;
        }
        if (options.offset) {
            sql += ' OFFSET ' + options.offset;
        }
        return sql;
    };
    WebSqlStore.prototype._sqlValue = function (value) {
        value = _.isNull(value) ? 'null' : _.isObject(value) ? JSON.stringify(value) : value.toString();
        value = value.replace(/"/g, '""');
        return '"' + value + '"';
    };
    WebSqlStore.prototype._dropTable = function (options) {
        var entity = options.entity;
        if (entity in this.entities && this.entities[entity].created !== false) {
            if (this._checkDb(options)) {
                var sql = this._sqlDropTable(entity);
                // reset flag
                this._executeTransaction(options, [sql]);
            }
        }
        else {
            // no need dropping as table was not created
            this.handleSuccess(options, undefined);
        }
    };
    WebSqlStore.prototype._createTable = function (options) {
        var entity = options.entity;
        if (!(entity in this.entities)) {
            this.entities[entity] = {
                table: entity
            };
        }
        if (this._checkDb(options)) {
            var sql = this._sqlCreateTable(entity);
            // reset flag
            this._executeTransaction(options, [sql]);
        }
    };
    WebSqlStore.prototype._checkTable = function (options, callback) {
        var that = this;
        var entity = options.entity;
        if (entity && (!this.entities[entity] || this.entities[entity].created === false)) {
            this._createTable({
                success: function () {
                    that.entities[entity].created = true;
                    callback();
                },
                error: function (error) {
                    that.handleError(options, error);
                },
                entity: entity
            });
        }
        else {
            // we know it's created already
            callback();
        }
    };
    WebSqlStore.prototype._insertOrReplace = function (model, options) {
        var entity = options.entity;
        var models = Collection_1.isCollection(model) ? model.models : [model];
        if (this._checkDb(options) && this._checkData(options, models)) {
            var statements = [];
            var sqlTemplate = 'INSERT OR REPLACE INTO \'' + this.entities[entity].table + '\' (';
            for (var i = 0; i < models.length; i++) {
                var amodel = models[i];
                var statement = ''; // the actual sql insert string with values
                if (!amodel.id) {
                    amodel.set(amodel.idAttribute, objectid.makeObjectID());
                }
                var value = options.attrs || amodel.attributes;
                var keys = ['id', 'data'];
                var json = JSON.stringify(value);
                while (BAD_UNICODES.test(json)) {
                    // workaround https://issues.apache.org/jira/browse/CB-9435 on iOS
                    json = json.replace('\u2028', '\\u2028').replace('\u2029', '\\u2029');
                }
                var args = [amodel.id, json];
                if (args.length > 0) {
                    var values = new Array(args.length).join('?,') + '?';
                    var columns = '\'' + keys.join('\',\'') + '\'';
                    statement += sqlTemplate + columns + ') VALUES (' + values + ');';
                    statements.push({
                        statement: statement,
                        arguments: args
                    });
                }
            }
            this._executeTransaction(options, statements, model.toJSON());
        }
    };
    WebSqlStore.prototype._select = function (model, options) {
        var entity = options.entity;
        if (this._checkDb(options)) {
            var lastStatement;
            var isCollection = !Model_1.isModel(model);
            var result;
            if (isCollection) {
                result = [];
            }
            else if (model) {
                options.models = [model];
            }
            var stm = this._sqlSelect(options, entity);
            var that = this;
            this.db.readTransaction(function (t) {
                var statement = stm.statement || stm;
                var args = stm.arguments;
                lastStatement = statement;
                diag.debug.info('sql statement: ' + statement);
                if (args) {
                    diag.debug.trace('arguments: ' + JSON.stringify(args));
                }
                t.executeSql(statement, args, function (tx, res) {
                    var len = res.rows.length;
                    for (var i = 0; i < len; i++) {
                        var item = res.rows.item(i);
                        var attrs;
                        try {
                            attrs = JSON.parse(item.data);
                        }
                        catch (e) {
                            that.trigger('error', e);
                            continue;
                        }
                        if (isCollection) {
                            result.push(attrs);
                        }
                        else {
                            result = attrs;
                            break;
                        }
                    }
                }, function (t2, e) {
                    // error
                    diag.debug.error('webSql error: ' + e.message);
                    return true; // abort
                });
            }, function (sqlError) {
                if (lastStatement) {
                    sqlError.sql = lastStatement;
                }
                diag.debug.error('WebSql Syntax Error: ' + sqlError.message);
                that.handleError(options, sqlError);
            }, function () {
                if (result) {
                    if (options.syncContext) {
                        result = options.syncContext.processAttributes(result, options);
                    }
                    that.handleSuccess(options, result);
                }
                else {
                    var error = new Error('no result');
                    if (lastStatement) {
                        error.sql = lastStatement;
                    }
                    that.handleError(options, error);
                }
            });
        }
    };
    WebSqlStore.prototype._delete = function (model, options) {
        var entity = options.entity;
        var models = Collection_1.isCollection(model) ? model.models : [model];
        if (this._checkDb(options)) {
            options.models = models;
            var sql = this._sqlDelete(options, entity);
            // reset flag
            this._executeTransaction(options, [sql], model.toJSON());
        }
    };
    WebSqlStore.prototype._executeSql = function (options) {
        if (options.sql) {
            this._executeTransaction(options, [options.sql]);
        }
    };
    WebSqlStore.prototype._executeTransaction = function (options, statements, result) {
        var _this = this;
        if (!this._checkDb(options)) {
            return; // database not open, error was issued by _checkDb() above
        }
        // following sequentially processes transactions avoiding running too many concurrently
        this.transactionPromise = this.transactionPromise.finally(function () {
            var lastStatement;
            return Q.Promise(function (resolve, reject) {
                /* transaction has 3 parameters: the transaction callback, the error callback and the success callback */
                return _this.db.transaction(function (t) {
                    return _.each(statements, function (stm) {
                        var statement = stm.statement || stm;
                        var args = stm.arguments;
                        lastStatement = statement;
                        if (diag.debug.enabled) {
                            diag.debug.info('sql statement: ' + statement);
                            if (args) {
                                diag.debug.trace('    arguments: ' + JSON.stringify(args));
                                diag.debug.assert(function () {
                                    return !args.some(function (arg) { return typeof arg === 'string' && BAD_UNICODES.test(arg); });
                                }, 'https://issues.apache.org/jira/browse/CB-9435 iOS unicode issue!');
                            }
                        }
                        t.executeSql(statement, args);
                    });
                }, reject, resolve);
            }).then(function () {
                return _this.handleSuccess(options, result) || null;
            }, function (error) {
                if (lastStatement) {
                    error.sql = lastStatement;
                }
                diag.debug.error(error.message);
                return _this.handleError(options, error) || null;
            });
        });
    };
    WebSqlStore.prototype._checkDb = function (options) {
        // has to be initialized first
        if (!this.db) {
            var error = new Error('db handler not initialized.');
            diag.debug.error(error.message);
            this.handleError(options, error);
            return false;
        }
        return true;
    };
    WebSqlStore.prototype._checkData = function (options, data) {
        if ((!_.isArray(data) || data.length === 0) && !_.isObject(data)) {
            var error = new Error('no data.');
            diag.debug.error(error.message);
            this.handleError(options, error);
            return false;
        }
        return true;
    };
    return WebSqlStore;
}(Store_1.Store));
exports.WebSqlStore = WebSqlStore;
// mixins
var webSqlStore = _.extend(WebSqlStore.prototype, {
    _type: 'Relution.livedata.WebSqlStore',
    size: 1024 * 1024,
    version: '1.0'
});
diag.debug.assert(function () { return WebSqlStore.prototype.isPrototypeOf(Object.create(webSqlStore)); });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2ViU3FsU3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvV2ViU3FsU3RvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBRXZCLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQ3JDLElBQVksUUFBUSxXQUFNLGtCQUFrQixDQUFDLENBQUE7QUFDN0MsSUFBWSxNQUFNLFdBQU0sZ0JBQWdCLENBQUMsQ0FBQTtBQUV6QyxzQkFBb0IsU0FBUyxDQUFDLENBQUE7QUFDOUIsc0JBQTZCLFNBQVMsQ0FBQyxDQUFBO0FBQ3ZDLDJCQUF1QyxjQUFjLENBQUMsQ0FBQTtBQTJCdEQ7Ozs7R0FJRztBQUNILHNCQUE2QixPQUFzQjtJQUNqRCxJQUFJLEVBQVksQ0FBQztJQUNqQixJQUFNLFlBQVksR0FBRyxjQUFjLENBQUM7SUFDcEMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6Qix3QkFBd0I7UUFDeEIsT0FBTyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNqQixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDckIsT0FBTyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO2dCQUMvQixPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUM7WUFDMUIsQ0FBQztZQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENB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RUFBL0QsQ0FBK0QsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogQGZpbGUgbGl2ZWRhdGEvV2ViU3FsU3RvcmUudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI0LjA2LjIwMTVcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIGxpdmVkYXRhXHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcclxuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcclxuXHJcbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi4vY29yZS9kaWFnJztcclxuaW1wb3J0ICogYXMgb2JqZWN0aWQgZnJvbSAnLi4vY29yZS9vYmplY3RpZCc7XHJcbmltcG9ydCAqIGFzIGNpcGhlciBmcm9tICcuLi9jb3JlL2NpcGhlcic7XHJcblxyXG5pbXBvcnQge1N0b3JlfSBmcm9tICcuL1N0b3JlJztcclxuaW1wb3J0IHtNb2RlbCwgaXNNb2RlbH0gZnJvbSAnLi9Nb2RlbCc7XHJcbmltcG9ydCB7Q29sbGVjdGlvbiwgaXNDb2xsZWN0aW9ufSBmcm9tICcuL0NvbGxlY3Rpb24nO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBXZWJTcWxPcHRpb25zIHtcclxuICBuYW1lOiBzdHJpbmc7XHJcbiAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XHJcbiAgdmVyc2lvbj86IHN0cmluZztcclxuXHJcbiAgc2l6ZT86IG51bWJlcjtcclxuICBsb2NhdGlvbj86IG51bWJlcjtcclxuXHJcbiAga2V5Pzogc3RyaW5nO1xyXG4gIHNlY3VyaXR5Pzogc3RyaW5nO1xyXG4gIGNyZWRlbnRpYWxzPzogYW55O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFN0YXRlbWVudCB7XHJcbiAgc3RhdGVtZW50OiBzdHJpbmcsXHJcbiAgYXJndW1lbnRzOiBhbnlbXVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFdlYlNxbEVycm9yIGV4dGVuZHMgRXJyb3Ige1xyXG4gIC8qKlxyXG4gICAqIGV2ZW50dWFsbHkgY29udGFpbnMgbGFzdCByZWNlbnRseSBleGVjdXRlZCBTUUwgY2F1c2luZyB0aGUgZXJyb3IuXHJcbiAgICovXHJcbiAgc3FsPzogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogb3BlbkRhdGFiYXNlIG9mIGJyb3dzZXIgb3IgdmlhIHJlcXVpcmUgd2Vic3FsLlxyXG4gKlxyXG4gKiBAaW50ZXJuYWwgTm90IHB1YmxpYyBBUEksIGV4cG9ydGVkIGZvciB0ZXN0aW5nIHB1cnBvc2VzIG9ubHkhXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gb3BlbkRhdGFiYXNlKG9wdGlvbnM6IFdlYlNxbE9wdGlvbnMpIHtcclxuICBsZXQgZGI6IERhdGFiYXNlO1xyXG4gIGNvbnN0IHNxbGl0ZVBsdWdpbiA9ICdzcWxpdGVQbHVnaW4nO1xyXG4gIGlmIChnbG9iYWxbc3FsaXRlUGx1Z2luXSkge1xyXG4gICAgLy8gZGV2aWNlIGltcGxlbWVudGF0aW9uXHJcbiAgICBvcHRpb25zID0gXy5jbG9uZShvcHRpb25zKTtcclxuICAgIGlmICghb3B0aW9ucy5rZXkpIHtcclxuICAgICAgaWYgKG9wdGlvbnMuc2VjdXJpdHkpIHtcclxuICAgICAgICBvcHRpb25zLmtleSA9IG9wdGlvbnMuc2VjdXJpdHk7XHJcbiAgICAgICAgZGVsZXRlIG9wdGlvbnMuc2VjdXJpdHk7XHJcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5jcmVkZW50aWFscykge1xyXG4gICAgICAgIG9wdGlvbnMua2V5ID0gY2lwaGVyLmhhc2hKc29uU3luYyhvcHRpb25zLmNyZWRlbnRpYWxzLCAnc2hhMjU2JykudG9TdHJpbmcoJ2hleCcpO1xyXG4gICAgICAgIGRlbGV0ZSBvcHRpb25zLmNyZWRlbnRpYWxzO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoIW9wdGlvbnMubG9jYXRpb24pIHtcclxuICAgICAgb3B0aW9ucy5sb2NhdGlvbiA9IDI7XHJcbiAgICB9XHJcbiAgICBkYiA9IGdsb2JhbFtzcWxpdGVQbHVnaW5dLm9wZW5EYXRhYmFzZShvcHRpb25zKTtcclxuICB9IGVsc2UgaWYgKGdsb2JhbFsnb3BlbkRhdGFiYXNlJ10pIHtcclxuICAgIC8vIG5hdGl2ZSBpbXBsZW1lbnRhdGlvblxyXG4gICAgZGIgPSBnbG9iYWxbJ29wZW5EYXRhYmFzZSddKG9wdGlvbnMubmFtZSwgb3B0aW9ucy52ZXJzaW9uIHx8ICcnLCBvcHRpb25zLmRlc2NyaXB0aW9uIHx8ICcnLCBvcHRpb25zLnNpemUgfHwgMTAyNCAqIDEwMjQpO1xyXG4gIH0gZWxzZSBpZiAocHJvY2VzcyAmJiAhcHJvY2Vzc1snYnJvd3NlciddKSB7XHJcbiAgICAvLyBub2RlLmpzIGltcGxlbWVudGF0aW9uXHJcbiAgICBsZXQgd2Vic3FsOiB0eXBlb2Ygd2luZG93Lm9wZW5EYXRhYmFzZTtcclxuICAgIHRyeSB7XHJcbiAgICAgIHdlYnNxbCA9IHJlcXVpcmUoJ3dlYnNxbCcpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgZGlhZy5kZWJ1Zy53YXJuKGVycm9yKTtcclxuICAgIH1cclxuICAgIGlmICh3ZWJzcWwpIHtcclxuICAgICAgZGIgPSB3ZWJzcWwob3B0aW9ucy5uYW1lLCBvcHRpb25zLnZlcnNpb24gfHwgJycsIG9wdGlvbnMuZGVzY3JpcHRpb24gfHwgJycsIG9wdGlvbnMuc2l6ZSB8fCAxMDI0ICogMTAyNCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoIWRiKSB7XHJcbiAgICAvLyB3aGVuIHRoaXMgaXMgcmVhY2hlZCBubyBzdXBwb3J0ZWQgaW1wbGVtZW50YXRpb24gaXMgcHJlc2VudFxyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdXZWJTUUwgaW1wbGVtZW50YXRpb24gaXMgbm90IGF2YWlsYWJsZScpO1xyXG4gIH1cclxuICByZXR1cm4gZGI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBtYXRjaGVzIGNoYXIgY29kZXMgc3ViamVjdCB0byBodHRwczovL2lzc3Vlcy5hcGFjaGUub3JnL2ppcmEvYnJvd3NlL0NCLTk0MzUgQ29yZG92YSBpT1MgYnVnLlxyXG4gKi9cclxuY29uc3QgQkFEX1VOSUNPREVTID0gL1tcXHUyMDI4XFx1MjAyOV0vO1xyXG5cclxuLyoqXHJcbiAqIHN0b3JlcyBMaXZlRGF0YSBpbnRvIHRoZSBXZWJTUUwgZGF0YWJhc2UuXHJcbiAqXHJcbiAqIEBleGFtcGxlXHJcbiAqXHJcbiAqIC8vIFRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gd2lsbCBzYXZlIHRoZSBjb21wbGV0ZSBtb2RlbCBkYXRhIGFzIGpzb25cclxuICogLy8gaW50byBhIGRhdGFiYXNlIGNvbHVtbiB3aXRoIHRoZSBuYW1lIFwiZGF0YVwiXHJcbiAqIGNsYXNzIE15Q29sbGVjdGlvbiBleHRlbmRzIFJlbHV0aW9uLmxpdmVkYXRhLkNvbGxlY3Rpb24ge307XHJcbiAqIE15Q29sbGVjdGlvbi5wcm90b3R5cGUubW9kZWwgPSBNeU1vZGVsO1xyXG4gKiBNeUNvbGxlY3Rpb24ucHJvdG90eXBlLmVudGl0eSA9ICdNeVRhYmxlTmFtZSc7XHJcbiAqIE15Q29sbGVjdGlvbi5wcm90b3R5cGUuc3RvcmUgPSBuZXcgUmVsdXRpb24ubGl2ZWRhdGEuV2ViU3FsU3RvcmUoKTtcclxuICpcclxuICogLy8gSWYgeW91IHdhbnQgdG8gdXNlIHNwZWNpZmljIGNvbHVtbnMgeW91IGNhbiBzcGVjaWZ5IHRoZSBmaWVsZHNcclxuICogLy8gaW4gdGhlIGVudGl0eSBvZiB5b3VyIG1vZGVsIGxpa2UgdGhpczpcclxuICogY2xhc3MgTXlNb2RlbCBleHRlbmRzIFJlbHV0aW9uLmxpdmVkYXRhLk1vZGVsIHt9O1xyXG4gKiBNeU1vZGVsLnByb3RvdHlwZS5pZEF0dHJpYnV0ZSA9ICdpZCc7XHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgV2ViU3FsU3RvcmUgZXh0ZW5kcyBTdG9yZSB7XHJcbiAgLy8gZm9sbG93aW5nIGFyZSBzdG9yZS1zcGVjaWZpYyBvcHRpb25zLCBkZWZhdWx0cyBzdG9yZWQgaW4gcHJvdG90eXBlIGF0IGVuZCBvZiB0aGlzIGZpbGVcclxuICBwcm90ZWN0ZWQgc2l6ZTogbnVtYmVyO1xyXG4gIHByb3RlY3RlZCB2ZXJzaW9uOiBzdHJpbmc7XHJcblxyXG4gIHByb3RlY3RlZCBkYjogRGF0YWJhc2UgPSBudWxsO1xyXG4gIHByb3RlY3RlZCBlbnRpdGllczogeyBbZW50aXR5OiBzdHJpbmddOiB7XHJcbiAgICB0YWJsZTogc3RyaW5nLCAgICAvLyBieSBkZWZhdWx0LCBlbnRpdHkgaXRzZWxmIGJ1dCBpcyBnaXZlbiBleHBsaWNpdGx5IGJ5IFN5bmNTdG9yZSFcclxuICAgIGNyZWF0ZWQ/OiBib29sZWFuIC8vIHRyaS1zdGF0ZSBhcyBpbml0aWFsIHN0YXRlIGlzIG5vdCBrbm93biBhbmQgdGh1cyB1bmRlZmluZWRcclxuICB9IH0gPSB7fTtcclxuXHJcbiAgY29uc3RydWN0b3Iob3B0aW9ucz86IGFueSkge1xyXG4gICAgc3VwZXIob3B0aW9ucyk7XHJcblxyXG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5lbnRpdGllcykge1xyXG4gICAgICBmb3IgKHZhciBlbnRpdHkgaW4gb3B0aW9ucy5lbnRpdGllcykge1xyXG4gICAgICAgIHRoaXMuZW50aXRpZXNbZW50aXR5XSA9IHtcclxuICAgICAgICAgIHRhYmxlOiBvcHRpb25zLmVudGl0aWVzW2VudGl0eV0gfHwgZW50aXR5XHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuX29wZW5EYihfLmRlZmF1bHRzKHtcclxuICAgICAgbmFtZTogdGhpcy5uYW1lLFxyXG4gICAgICBzaXplOiB0aGlzLnNpemUsXHJcbiAgICAgIHZlcnNpb246IHRoaXMudmVyc2lvbixcclxuXHJcbiAgICAgIGVycm9yOiAoZXJyb3I6IEVycm9yKSA9PiB7XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcihlcnJvci5tZXNzYWdlKTtcclxuICAgICAgICB0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKTtcclxuICAgICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yJywgZXJyb3IpO1xyXG4gICAgICB9XHJcbiAgICB9LCBvcHRpb25zKSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBjbG9zZXMgdGhlIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBjbG9zZSgpIHtcclxuICAgIGRpYWcuZGVidWcuaW5mbygnU3RvcmUgY2xvc2UnKTtcclxuICAgIGlmICh0aGlzLmRiKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgLy8gc29tZSBpbXBsZW1lbnRhdGlvbnMgb2ZmZXIgYSBjbG9zZSgpIG1ldGhvZFxyXG4gICAgICAgIGlmICgoPGFueT50aGlzLmRiKS5jbG9zZSkge1xyXG4gICAgICAgICAgKDxhbnk+dGhpcy5kYikuY2xvc2UoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgdGhpcy5kYiA9IG51bGw7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBfb3BlbkRiKG9wdGlvbnM6IGFueSkge1xyXG4gICAgdmFyIGVycm9yOiBFcnJvciB8IG51bWJlciB8IHN0cmluZztcclxuICAgIGlmICghdGhpcy5kYikge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIHRoaXMuZGIgPSBvcGVuRGF0YWJhc2Uob3B0aW9ucyk7XHJcbiAgICAgICAgaWYgKHRoaXMuZW50aXRpZXMpIHtcclxuICAgICAgICAgIGZvciAodmFyIGVudGl0eSBpbiB0aGlzLmVudGl0aWVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZVRhYmxlKHtcclxuICAgICAgICAgICAgICBlbnRpdHk6IGVudGl0eVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBlcnJvciA9IGU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5kYikge1xyXG4gICAgICBpZiAodGhpcy52ZXJzaW9uICYmIHRoaXMuZGIudmVyc2lvbiAhPT0gdGhpcy52ZXJzaW9uICYmIHRoaXMuZGIuY2hhbmdlVmVyc2lvbikge1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZURiKG9wdGlvbnMpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuaGFuZGxlU3VjY2VzcyhvcHRpb25zLCB0aGlzLmRiKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIGlmIChlcnJvciA9PT0gMiB8fCBlcnJvciA9PT0gJzInKSB7XHJcbiAgICAgIC8vIFZlcnNpb24gbnVtYmVyIG1pc21hdGNoLlxyXG4gICAgICB0aGlzLl91cGRhdGVEYihvcHRpb25zKTtcclxuICAgIH0gZWxzZSBpZiAoZXJyb3IpIHtcclxuICAgICAgaWYgKCFfLmlzRXJyb3IoZXJyb3IpKSB7XHJcbiAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoJycgKyBlcnJvcik7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCA8RXJyb3I+ZXJyb3IpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5oYW5kbGVTdWNjZXNzKG9wdGlvbnMsIHRoaXMuZGIpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBfdXBkYXRlRGIob3B0aW9uczogV2ViU3FsT3B0aW9ucykge1xyXG4gICAgdmFyIGVycm9yOiBFcnJvcjtcclxuICAgIHZhciBsYXN0U3FsOiBzdHJpbmc7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICB0cnkge1xyXG4gICAgICBpZiAoIXRoaXMuZGIpIHtcclxuICAgICAgICB0aGlzLmRiID0gb3BlbkRhdGFiYXNlKG9wdGlvbnMpO1xyXG4gICAgICB9XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgdmFyIGFyU3FsID0gdGhpcy5fc3FsVXBkYXRlRGF0YWJhc2UodGhpcy5kYi52ZXJzaW9uLCB0aGlzLnZlcnNpb24pO1xyXG4gICAgICAgIHRoaXMuZGIuY2hhbmdlVmVyc2lvbih0aGlzLmRiLnZlcnNpb24sIHRoaXMudmVyc2lvbiwgZnVuY3Rpb24gKHR4KSB7XHJcbiAgICAgICAgICBfLmVhY2goYXJTcWwsIGZ1bmN0aW9uIChzcWwpIHtcclxuICAgICAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzcWwgc3RhdGVtZW50OiAnICsgc3FsKTtcclxuICAgICAgICAgICAgbGFzdFNxbCA9IHNxbDtcclxuICAgICAgICAgICAgdHguZXhlY3V0ZVNxbChzcWwpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycjogYW55KSB7XHJcbiAgICAgICAgICBpZiAoIWxhc3RTcWwgJiYgdGhhdC5kYi52ZXJzaW9uID09PSB0aGF0LnZlcnNpb24pIHtcclxuICAgICAgICAgICAgLy8gbm90IGEgcmVhbCBlcnJvciwgY29uY3VycmVudCBtaWdyYXRpb24gYXR0ZW1wdCBjb21wbGV0ZWQgYWxyZWFkeVxyXG4gICAgICAgICAgICB0aGF0LmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgdGhhdC5kYik7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAobGFzdFNxbCkge1xyXG4gICAgICAgICAgICAgIGVyci5zcWwgPSBsYXN0U3FsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoYXQuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB0aGF0LmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgdGhhdC5kYik7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBlcnJvciA9IGU7XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignd2ViU3FsIGNoYW5nZSB2ZXJzaW9uIGZhaWxlZCwgREItVmVyc2lvbjogJyArIHRoaXMuZGIudmVyc2lvbik7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgZXJyb3IgPSBlO1xyXG4gICAgfVxyXG4gICAgaWYgKGVycm9yKSB7XHJcbiAgICAgIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc3luYyhtZXRob2Q6IHN0cmluZywgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgb3B0aW9ucz86IGFueSk6IFEuUHJvbWlzZTxhbnk+IHtcclxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG4gICAgdmFyIHEgPSBRLmRlZmVyKCk7XHJcbiAgICB2YXIgb3B0cyA9IF8uZXh0ZW5kKHtcclxuICAgICAgZW50aXR5OiBtb2RlbC5lbnRpdHkgfHwgb3B0aW9ucy5lbnRpdHlcclxuICAgIH0sIG9wdGlvbnMgfHwge30sIHtcclxuICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlc3BvbnNlOiBhbnkpIHtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gdGhhdC5oYW5kbGVTdWNjZXNzKG9wdGlvbnMsIHJlc3BvbnNlKSB8fCByZXNwb25zZTtcclxuICAgICAgICBxLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICB9LFxyXG4gICAgICBlcnJvcjogZnVuY3Rpb24gKGVycm9yOiBFcnJvcikge1xyXG4gICAgICAgIHZhciByZXN1bHQgPSB0aGF0LmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKTtcclxuICAgICAgICBpZiAocmVzdWx0KSB7XHJcbiAgICAgICAgICBxLnJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHEucmVqZWN0KGVycm9yKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHN3aXRjaCAobWV0aG9kKSB7XHJcbiAgICAgIGNhc2UgJ2NyZWF0ZSc6XHJcbiAgICAgICAgdGhhdC5fY2hlY2tUYWJsZShvcHRzLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB0aGF0Ll9pbnNlcnRPclJlcGxhY2UobW9kZWwsIG9wdHMpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAndXBkYXRlJzpcclxuICAgICAgY2FzZSAncGF0Y2gnOlxyXG4gICAgICAgIHRoYXQuX2NoZWNrVGFibGUob3B0cywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdGhhdC5faW5zZXJ0T3JSZXBsYWNlKG1vZGVsLCBvcHRzKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ2RlbGV0ZSc6XHJcbiAgICAgICAgdGhhdC5fY2hlY2tUYWJsZShvcHRzLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB0aGF0Ll9kZWxldGUobW9kZWwsIG9wdHMpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAncmVhZCc6XHJcbiAgICAgICAgdGhhdC5fY2hlY2tUYWJsZShvcHRzLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICB0aGF0Ll9zZWxlY3QobW9kZWwsIG9wdHMpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuICAgIHJldHVybiBxLnByb21pc2U7XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgc2VsZWN0KG9wdGlvbnM6IGFueSkge1xyXG4gICAgdGhpcy5fc2VsZWN0KG51bGwsIG9wdGlvbnMpO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIGRyb3Aob3B0aW9uczogYW55KSB7XHJcbiAgICB0aGlzLl9kcm9wVGFibGUob3B0aW9ucyk7XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgY3JlYXRlVGFibGUob3B0aW9uczogYW55KSB7XHJcbiAgICB0aGlzLl9jcmVhdGVUYWJsZShvcHRpb25zKTtcclxuICB9XHJcblxyXG4gIHByb3RlY3RlZCBleGVjdXRlKG9wdGlvbnM6IGFueSkge1xyXG4gICAgdGhpcy5fZXhlY3V0ZVNxbChvcHRpb25zKTtcclxuICB9XHJcblxyXG4gIHByb3RlY3RlZCBfc3FsVXBkYXRlRGF0YWJhc2Uob2xkVmVyc2lvbjogc3RyaW5nIHwgRE9NU3RyaW5nLCBuZXdWZXJzaW9uOiBzdHJpbmcpIHtcclxuICAgIC8vIGNyZWF0ZSBzcWwgYXJyYXksIHNpbXBseSBkcm9wIGFuZCBjcmVhdGUgdGhlIGRhdGFiYXNlXHJcbiAgICB2YXIgc3FsOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgZm9yICh2YXIgZW50aXR5IGluIHRoaXMuZW50aXRpZXMpIHtcclxuICAgICAgc3FsLnB1c2godGhpcy5fc3FsRHJvcFRhYmxlKGVudGl0eSkpO1xyXG4gICAgICBzcWwucHVzaCh0aGlzLl9zcWxDcmVhdGVUYWJsZShlbnRpdHkpKTtcclxuICAgIH1cclxuICAgIHJldHVybiBzcWw7XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgX3NxbERyb3BUYWJsZShlbnRpdHk6IHN0cmluZykge1xyXG4gICAgcmV0dXJuIGBEUk9QIFRBQkxFIElGIEVYSVNUUyAnJHt0aGlzLmVudGl0aWVzW2VudGl0eV0udGFibGV9JztgO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIF9zcWxDcmVhdGVUYWJsZShlbnRpdHk6IHN0cmluZykge1xyXG4gICAgcmV0dXJuIGBDUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyAnJHt0aGlzLmVudGl0aWVzW2VudGl0eV0udGFibGV9JyAoaWQgVkFSQ0hBUigyNTUpIE5PVCBOVUxMIFBSSU1BUlkgS0VZIEFTQyBVTklRVUUsIGRhdGEgVEVYVCBOT1QgTlVMTCk7YDtcclxuICB9XHJcblxyXG4gIHByb3RlY3RlZCBfc3FsRGVsZXRlKG9wdGlvbnM6IGFueSwgZW50aXR5OiBzdHJpbmcpIHtcclxuICAgIHZhciBzcWwgPSAnREVMRVRFIEZST00gXFwnJyArIHRoaXMuZW50aXRpZXNbZW50aXR5XS50YWJsZSArICdcXCcnO1xyXG4gICAgdmFyIHdoZXJlID0gdGhpcy5fc3FsV2hlcmVGcm9tRGF0YShvcHRpb25zLCBlbnRpdHkpO1xyXG4gICAgaWYgKHdoZXJlKSB7XHJcbiAgICAgIHNxbCArPSAnIFdIRVJFICcgKyB3aGVyZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGZhbHNlLCAnYXR0ZW1wdCBvZiBkZWxldGlvbiB3aXRob3V0IHdoZXJlIGNsYXVzZScpO1xyXG4gICAgfVxyXG4gICAgc3FsICs9IG9wdGlvbnMuYW5kID8gJyBBTkQgJyArIG9wdGlvbnMuYW5kIDogJyc7XHJcbiAgICByZXR1cm4gc3FsO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIF9zcWxXaGVyZUZyb21EYXRhKG9wdGlvbnM6IGFueSwgZW50aXR5OiBzdHJpbmcpIHtcclxuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMubW9kZWxzICYmIGVudGl0eSkge1xyXG4gICAgICB2YXIgaWRzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgIF8uZWFjaChvcHRpb25zLm1vZGVscywgZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCkge1xyXG4gICAgICAgIGlmICghbW9kZWwuaXNOZXcoKSkge1xyXG4gICAgICAgICAgaWRzLnB1c2godGhhdC5fc3FsVmFsdWUobW9kZWwuaWQpKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgICBpZiAoaWRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICByZXR1cm4gJ2lkIElOICgnICsgaWRzLmpvaW4oJywnKSArICcpJztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuICcnO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIF9zcWxTZWxlY3Qob3B0aW9uczogYW55LCBlbnRpdHk6IHN0cmluZykge1xyXG4gICAgdmFyIHNxbCA9ICdTRUxFQ1QgJztcclxuICAgIHNxbCArPSAnKic7XHJcbiAgICBzcWwgKz0gJyBGUk9NIFxcJycgKyB0aGlzLmVudGl0aWVzW2VudGl0eV0udGFibGUgKyAnXFwnJztcclxuXHJcbiAgICBpZiAob3B0aW9ucy5zeW5jQ29udGV4dCkge1xyXG4gICAgICAvLyBuZXcgY29kZSBtdXN0IGRvIHN0dWZmIGluIEphdmFTY3JpcHQsIG5vdCBTUUxcclxuICAgICAgcmV0dXJuIHNxbDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgd2hlcmUgPSB0aGlzLl9zcWxXaGVyZUZyb21EYXRhKG9wdGlvbnMsIGVudGl0eSk7XHJcbiAgICBpZiAod2hlcmUpIHtcclxuICAgICAgc3FsICs9ICcgV0hFUkUgJyArIHdoZXJlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvcHRpb25zLm9yZGVyKSB7XHJcbiAgICAgIHNxbCArPSAnIE9SREVSIEJZICcgKyBvcHRpb25zLm9yZGVyO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvcHRpb25zLmxpbWl0KSB7XHJcbiAgICAgIHNxbCArPSAnIExJTUlUICcgKyBvcHRpb25zLmxpbWl0O1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvcHRpb25zLm9mZnNldCkge1xyXG4gICAgICBzcWwgKz0gJyBPRkZTRVQgJyArIG9wdGlvbnMub2Zmc2V0O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzcWw7XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgX3NxbFZhbHVlKHZhbHVlOiBhbnkpIHtcclxuICAgIHZhbHVlID0gXy5pc051bGwodmFsdWUpID8gJ251bGwnIDogXy5pc09iamVjdCh2YWx1ZSkgPyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOiB2YWx1ZS50b1N0cmluZygpO1xyXG4gICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpO1xyXG4gICAgcmV0dXJuICdcIicgKyB2YWx1ZSArICdcIic7XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgX2Ryb3BUYWJsZShvcHRpb25zOiBhbnkpIHtcclxuICAgIHZhciBlbnRpdHkgPSBvcHRpb25zLmVudGl0eTtcclxuICAgIGlmIChlbnRpdHkgaW4gdGhpcy5lbnRpdGllcyAmJiB0aGlzLmVudGl0aWVzW2VudGl0eV0uY3JlYXRlZCAhPT0gZmFsc2UpIHtcclxuICAgICAgaWYgKHRoaXMuX2NoZWNrRGIob3B0aW9ucykpIHtcclxuICAgICAgICB2YXIgc3FsID0gdGhpcy5fc3FsRHJvcFRhYmxlKGVudGl0eSk7XHJcbiAgICAgICAgLy8gcmVzZXQgZmxhZ1xyXG4gICAgICAgIHRoaXMuX2V4ZWN1dGVUcmFuc2FjdGlvbihvcHRpb25zLCBbc3FsXSk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIG5vIG5lZWQgZHJvcHBpbmcgYXMgdGFibGUgd2FzIG5vdCBjcmVhdGVkXHJcbiAgICAgIHRoaXMuaGFuZGxlU3VjY2VzcyhvcHRpb25zLCB1bmRlZmluZWQpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIF9jcmVhdGVUYWJsZShvcHRpb25zOiBhbnkpIHtcclxuICAgIHZhciBlbnRpdHkgPSBvcHRpb25zLmVudGl0eTtcclxuICAgIGlmICghKGVudGl0eSBpbiB0aGlzLmVudGl0aWVzKSkge1xyXG4gICAgICB0aGlzLmVudGl0aWVzW2VudGl0eV0gPSB7XHJcbiAgICAgICAgdGFibGU6IGVudGl0eVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLl9jaGVja0RiKG9wdGlvbnMpKSB7XHJcbiAgICAgIHZhciBzcWwgPSB0aGlzLl9zcWxDcmVhdGVUYWJsZShlbnRpdHkpO1xyXG4gICAgICAvLyByZXNldCBmbGFnXHJcbiAgICAgIHRoaXMuX2V4ZWN1dGVUcmFuc2FjdGlvbihvcHRpb25zLCBbc3FsXSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgX2NoZWNrVGFibGUob3B0aW9uczogYW55LCBjYWxsYmFjazogRnVuY3Rpb24pIHtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgIHZhciBlbnRpdHkgPSBvcHRpb25zLmVudGl0eTtcclxuICAgIGlmIChlbnRpdHkgJiYgKCF0aGlzLmVudGl0aWVzW2VudGl0eV0gfHwgdGhpcy5lbnRpdGllc1tlbnRpdHldLmNyZWF0ZWQgPT09IGZhbHNlKSkge1xyXG4gICAgICB0aGlzLl9jcmVhdGVUYWJsZSh7XHJcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdGhhdC5lbnRpdGllc1tlbnRpdHldLmNyZWF0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiBmdW5jdGlvbiAoZXJyb3I6IEVycm9yKSB7XHJcbiAgICAgICAgICB0aGF0LmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVudGl0eTogZW50aXR5XHJcbiAgICAgIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gd2Uga25vdyBpdCdzIGNyZWF0ZWQgYWxyZWFkeVxyXG4gICAgICBjYWxsYmFjaygpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIF9pbnNlcnRPclJlcGxhY2UobW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgb3B0aW9uczogYW55KSB7XHJcbiAgICB2YXIgZW50aXR5ID0gb3B0aW9ucy5lbnRpdHk7XHJcbiAgICB2YXIgbW9kZWxzID0gaXNDb2xsZWN0aW9uKG1vZGVsKSA/IG1vZGVsLm1vZGVscyA6IFttb2RlbF07XHJcbiAgICBpZiAodGhpcy5fY2hlY2tEYihvcHRpb25zKSAmJiB0aGlzLl9jaGVja0RhdGEob3B0aW9ucywgbW9kZWxzKSkge1xyXG4gICAgICB2YXIgc3RhdGVtZW50czogU3RhdGVtZW50W10gPSBbXTtcclxuICAgICAgdmFyIHNxbFRlbXBsYXRlID0gJ0lOU0VSVCBPUiBSRVBMQUNFIElOVE8gXFwnJyArIHRoaXMuZW50aXRpZXNbZW50aXR5XS50YWJsZSArICdcXCcgKCc7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbW9kZWxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGFtb2RlbCA9IG1vZGVsc1tpXTtcclxuICAgICAgICB2YXIgc3RhdGVtZW50ID0gJyc7IC8vIHRoZSBhY3R1YWwgc3FsIGluc2VydCBzdHJpbmcgd2l0aCB2YWx1ZXNcclxuICAgICAgICBpZiAoIWFtb2RlbC5pZCkge1xyXG4gICAgICAgICAgYW1vZGVsLnNldChhbW9kZWwuaWRBdHRyaWJ1dGUsIG9iamVjdGlkLm1ha2VPYmplY3RJRCgpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHZhbHVlID0gb3B0aW9ucy5hdHRycyB8fCBhbW9kZWwuYXR0cmlidXRlcztcclxuICAgICAgICB2YXIga2V5cyA9IFsgJ2lkJywgJ2RhdGEnIF07XHJcbiAgICAgICAgdmFyIGpzb24gPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XHJcbiAgICAgICAgd2hpbGUgKEJBRF9VTklDT0RFUy50ZXN0KGpzb24pKSB7XHJcbiAgICAgICAgICAvLyB3b3JrYXJvdW5kIGh0dHBzOi8vaXNzdWVzLmFwYWNoZS5vcmcvamlyYS9icm93c2UvQ0ItOTQzNSBvbiBpT1NcclxuICAgICAgICAgIGpzb24gPSBqc29uLnJlcGxhY2UoJ1xcdTIwMjgnLCAnXFxcXHUyMDI4JykucmVwbGFjZSgnXFx1MjAyOScsICdcXFxcdTIwMjknKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGFyZ3MgPSBbIGFtb2RlbC5pZCwganNvbiBdO1xyXG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIHZhciB2YWx1ZXMgPSBuZXcgQXJyYXkoYXJncy5sZW5ndGgpLmpvaW4oJz8sJykgKyAnPyc7XHJcbiAgICAgICAgICB2YXIgY29sdW1ucyA9ICdcXCcnICsga2V5cy5qb2luKCdcXCcsXFwnJykgKyAnXFwnJztcclxuICAgICAgICAgIHN0YXRlbWVudCArPSBzcWxUZW1wbGF0ZSArIGNvbHVtbnMgKyAnKSBWQUxVRVMgKCcgKyB2YWx1ZXMgKyAnKTsnO1xyXG4gICAgICAgICAgc3RhdGVtZW50cy5wdXNoKHtcclxuICAgICAgICAgICAgc3RhdGVtZW50OiBzdGF0ZW1lbnQsXHJcbiAgICAgICAgICAgIGFyZ3VtZW50czogYXJnc1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuX2V4ZWN1dGVUcmFuc2FjdGlvbihvcHRpb25zLCBzdGF0ZW1lbnRzLCBtb2RlbC50b0pTT04oKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgX3NlbGVjdChtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uLCBvcHRpb25zOiBhbnkpIHtcclxuICAgIHZhciBlbnRpdHkgPSBvcHRpb25zLmVudGl0eTtcclxuICAgIGlmICh0aGlzLl9jaGVja0RiKG9wdGlvbnMpKSB7XHJcbiAgICAgIHZhciBsYXN0U3RhdGVtZW50OiBzdHJpbmc7XHJcbiAgICAgIHZhciBpc0NvbGxlY3Rpb24gPSAhaXNNb2RlbChtb2RlbCk7XHJcbiAgICAgIHZhciByZXN1bHQ6IGFueTtcclxuICAgICAgaWYgKGlzQ29sbGVjdGlvbikge1xyXG4gICAgICAgIHJlc3VsdCA9IFtdO1xyXG4gICAgICB9IGVsc2UgaWYgKG1vZGVsKSB7XHJcbiAgICAgICAgb3B0aW9ucy5tb2RlbHMgPSBbbW9kZWxdO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciBzdG06IGFueSA9IHRoaXMuX3NxbFNlbGVjdChvcHRpb25zLCBlbnRpdHkpO1xyXG4gICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgIHRoaXMuZGIucmVhZFRyYW5zYWN0aW9uKGZ1bmN0aW9uICh0KSB7XHJcbiAgICAgICAgdmFyIHN0YXRlbWVudCA9IHN0bS5zdGF0ZW1lbnQgfHwgc3RtO1xyXG4gICAgICAgIHZhciBhcmdzID0gc3RtLmFyZ3VtZW50cztcclxuICAgICAgICBsYXN0U3RhdGVtZW50ID0gc3RhdGVtZW50O1xyXG4gICAgICAgIGRpYWcuZGVidWcuaW5mbygnc3FsIHN0YXRlbWVudDogJyArIHN0YXRlbWVudCk7XHJcbiAgICAgICAgaWYgKGFyZ3MpIHtcclxuICAgICAgICAgIGRpYWcuZGVidWcudHJhY2UoJ2FyZ3VtZW50czogJyArIEpTT04uc3RyaW5naWZ5KGFyZ3MpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdC5leGVjdXRlU3FsKHN0YXRlbWVudCwgYXJncywgZnVuY3Rpb24gKHR4LCByZXMpIHtcclxuICAgICAgICAgIHZhciBsZW4gPSByZXMucm93cy5sZW5ndGg7XHJcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBpdGVtID0gcmVzLnJvd3MuaXRlbShpKTtcclxuICAgICAgICAgICAgdmFyIGF0dHJzOiBhbnk7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgYXR0cnMgPSBKU09OLnBhcnNlKGl0ZW0uZGF0YSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2Vycm9yJywgZSk7XHJcbiAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGlzQ29sbGVjdGlvbikge1xyXG4gICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGF0dHJzKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICByZXN1bHQgPSBhdHRycztcclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIGZ1bmN0aW9uICh0MjogU1FMVHJhbnNhY3Rpb24sIGU6IFNRTEVycm9yKSB7XHJcbiAgICAgICAgICAvLyBlcnJvclxyXG4gICAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignd2ViU3FsIGVycm9yOiAnICsgZS5tZXNzYWdlKTtcclxuICAgICAgICAgIHJldHVybiB0cnVlOyAvLyBhYm9ydFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9LCBmdW5jdGlvbiAoc3FsRXJyb3I6IGFueSkgeyAvLyBlcnJvckNhbGxiYWNrXHJcbiAgICAgICAgaWYgKGxhc3RTdGF0ZW1lbnQpIHtcclxuICAgICAgICAgIHNxbEVycm9yLnNxbCA9IGxhc3RTdGF0ZW1lbnQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ1dlYlNxbCBTeW50YXggRXJyb3I6ICcgKyBzcWxFcnJvci5tZXNzYWdlKTtcclxuICAgICAgICB0aGF0LmhhbmRsZUVycm9yKG9wdGlvbnMsIHNxbEVycm9yKTtcclxuICAgICAgfSwgZnVuY3Rpb24gKCkgeyAvLyB2b2lkQ2FsbGJhY2sgKHN1Y2Nlc3MpXHJcbiAgICAgICAgaWYgKHJlc3VsdCkge1xyXG4gICAgICAgICAgaWYgKG9wdGlvbnMuc3luY0NvbnRleHQpIHtcclxuICAgICAgICAgICAgcmVzdWx0ID0gb3B0aW9ucy5zeW5jQ29udGV4dC5wcm9jZXNzQXR0cmlidXRlcyhyZXN1bHQsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdGhhdC5oYW5kbGVTdWNjZXNzKG9wdGlvbnMsIHJlc3VsdCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGxldCBlcnJvcjogV2ViU3FsRXJyb3IgPSBuZXcgRXJyb3IoJ25vIHJlc3VsdCcpO1xyXG4gICAgICAgICAgaWYgKGxhc3RTdGF0ZW1lbnQpIHtcclxuICAgICAgICAgICAgZXJyb3Iuc3FsID0gbGFzdFN0YXRlbWVudDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHRoYXQuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgX2RlbGV0ZShtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uLCBvcHRpb25zOiBhbnkpIHtcclxuICAgIHZhciBlbnRpdHkgPSBvcHRpb25zLmVudGl0eTtcclxuICAgIHZhciBtb2RlbHMgPSBpc0NvbGxlY3Rpb24obW9kZWwpID8gbW9kZWwubW9kZWxzIDogW21vZGVsXTtcclxuICAgIGlmICh0aGlzLl9jaGVja0RiKG9wdGlvbnMpKSB7XHJcbiAgICAgIG9wdGlvbnMubW9kZWxzID0gbW9kZWxzO1xyXG4gICAgICB2YXIgc3FsID0gdGhpcy5fc3FsRGVsZXRlKG9wdGlvbnMsIGVudGl0eSk7XHJcbiAgICAgIC8vIHJlc2V0IGZsYWdcclxuICAgICAgdGhpcy5fZXhlY3V0ZVRyYW5zYWN0aW9uKG9wdGlvbnMsIFtzcWxdLCBtb2RlbC50b0pTT04oKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgX2V4ZWN1dGVTcWwob3B0aW9uczogYW55KSB7XHJcbiAgICBpZiAob3B0aW9ucy5zcWwpIHtcclxuICAgICAgdGhpcy5fZXhlY3V0ZVRyYW5zYWN0aW9uKG9wdGlvbnMsIFtvcHRpb25zLnNxbF0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSB0cmFuc2FjdGlvblByb21pc2UgPSBRLnJlc29sdmUobnVsbCk7XHJcblxyXG4gIHByb3RlY3RlZCBfZXhlY3V0ZVRyYW5zYWN0aW9uKG9wdGlvbnM6IGFueSwgc3RhdGVtZW50czogKFN0YXRlbWVudCB8IHN0cmluZylbXSwgcmVzdWx0PzogYW55KSB7XHJcbiAgICBpZiAoIXRoaXMuX2NoZWNrRGIob3B0aW9ucykpIHtcclxuICAgICAgcmV0dXJuOyAvLyBkYXRhYmFzZSBub3Qgb3BlbiwgZXJyb3Igd2FzIGlzc3VlZCBieSBfY2hlY2tEYigpIGFib3ZlXHJcbiAgICB9XHJcblxyXG4gICAgLy8gZm9sbG93aW5nIHNlcXVlbnRpYWxseSBwcm9jZXNzZXMgdHJhbnNhY3Rpb25zIGF2b2lkaW5nIHJ1bm5pbmcgdG9vIG1hbnkgY29uY3VycmVudGx5XHJcbiAgICB0aGlzLnRyYW5zYWN0aW9uUHJvbWlzZSA9IHRoaXMudHJhbnNhY3Rpb25Qcm9taXNlLmZpbmFsbHkoKCkgPT4ge1xyXG4gICAgICB2YXIgbGFzdFN0YXRlbWVudDogc3RyaW5nO1xyXG4gICAgICByZXR1cm4gUS5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAvKiB0cmFuc2FjdGlvbiBoYXMgMyBwYXJhbWV0ZXJzOiB0aGUgdHJhbnNhY3Rpb24gY2FsbGJhY2ssIHRoZSBlcnJvciBjYWxsYmFjayBhbmQgdGhlIHN1Y2Nlc3MgY2FsbGJhY2sgKi9cclxuICAgICAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbigodCkgPT4ge1xyXG4gICAgICAgICAgcmV0dXJuIF8uZWFjaChzdGF0ZW1lbnRzLCAoc3RtOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgdmFyIHN0YXRlbWVudCA9IHN0bS5zdGF0ZW1lbnQgfHwgc3RtO1xyXG4gICAgICAgICAgICB2YXIgYXJncyA9IHN0bS5hcmd1bWVudHM7XHJcbiAgICAgICAgICAgIGxhc3RTdGF0ZW1lbnQgPSBzdGF0ZW1lbnQ7XHJcblxyXG4gICAgICAgICAgICBpZiAoZGlhZy5kZWJ1Zy5lbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzcWwgc3RhdGVtZW50OiAnICsgc3RhdGVtZW50KTtcclxuICAgICAgICAgICAgICBpZiAoYXJncykge1xyXG4gICAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy50cmFjZSgnICAgIGFyZ3VtZW50czogJyArIEpTT04uc3RyaW5naWZ5KGFyZ3MpKTtcclxuICAgICAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuICFhcmdzLnNvbWUoKGFyZzogYW55KSA9PiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyAmJiBCQURfVU5JQ09ERVMudGVzdChhcmcpKTtcclxuICAgICAgICAgICAgICAgIH0sICdodHRwczovL2lzc3Vlcy5hcGFjaGUub3JnL2ppcmEvYnJvd3NlL0NCLTk0MzUgaU9TIHVuaWNvZGUgaXNzdWUhJyk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0LmV4ZWN1dGVTcWwoc3RhdGVtZW50LCBhcmdzKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sIHJlamVjdCwgPFNRTFZvaWRDYWxsYmFjaz5yZXNvbHZlKTtcclxuICAgICAgfSkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlU3VjY2VzcyhvcHRpb25zLCByZXN1bHQpIHx8IG51bGw7XHJcbiAgICAgIH0sIChlcnJvcjogV2ViU3FsRXJyb3IpID0+IHtcclxuICAgICAgICBpZiAobGFzdFN0YXRlbWVudCkge1xyXG4gICAgICAgICAgZXJyb3Iuc3FsID0gbGFzdFN0YXRlbWVudDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcihlcnJvci5tZXNzYWdlKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcikgfHwgbnVsbDtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByb3RlY3RlZCBfY2hlY2tEYihvcHRpb25zOiBhbnkpIHtcclxuICAgIC8vIGhhcyB0byBiZSBpbml0aWFsaXplZCBmaXJzdFxyXG4gICAgaWYgKCF0aGlzLmRiKSB7XHJcbiAgICAgIHZhciBlcnJvciA9IG5ldyBFcnJvcignZGIgaGFuZGxlciBub3QgaW5pdGlhbGl6ZWQuJyk7XHJcbiAgICAgIGRpYWcuZGVidWcuZXJyb3IoZXJyb3IubWVzc2FnZSk7XHJcbiAgICAgIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIHByb3RlY3RlZCBfY2hlY2tEYXRhKG9wdGlvbnM6IGFueSwgZGF0YTogTW9kZWxbXSkge1xyXG4gICAgaWYgKCghXy5pc0FycmF5KGRhdGEpIHx8IGRhdGEubGVuZ3RoID09PSAwKSAmJiAhXy5pc09iamVjdChkYXRhKSkge1xyXG4gICAgICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IoJ25vIGRhdGEuJyk7XHJcbiAgICAgIGRpYWcuZGVidWcuZXJyb3IoZXJyb3IubWVzc2FnZSk7XHJcbiAgICAgIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG59XHJcblxyXG4vLyBtaXhpbnNcclxubGV0IHdlYlNxbFN0b3JlID0gXy5leHRlbmQoV2ViU3FsU3RvcmUucHJvdG90eXBlLCB7XHJcbiAgX3R5cGU6ICdSZWx1dGlvbi5saXZlZGF0YS5XZWJTcWxTdG9yZScsXHJcblxyXG4gIHNpemU6IDEwMjQgKiAxMDI0LCAvLyAxIE1CXHJcbiAgdmVyc2lvbjogJzEuMCdcclxufSk7XHJcbmRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IFdlYlNxbFN0b3JlLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKE9iamVjdC5jcmVhdGUod2ViU3FsU3RvcmUpKSk7XHJcbiJdfQ==