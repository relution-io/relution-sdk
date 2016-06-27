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

import {Store} from './Store';
import {Model, isModel} from './Model';
import {isCollection} from './Collection';

import {ObjectID} from './objectid';

import * as diag from '../core/diag';

/**
 * stores LiveData into the WebSQL database.
 */
export class AbstractSqlStore extends Store {

  // following are store-specific options, defaults stored in prototype at end of this file
  protected size: number;
  protected version: string;

  protected db: any = null;
  protected entities: { [entity: string]: {
    table: string,    // by default, entity itself but is given explicitly by SyncStore!
    created?: boolean // tri-state as initial state is not known and thus undefined
  } } = {};

  constructor(options?: any) {
    super(options);

    if (options && options.entities) {
      for (var entity in options.entities) {
        this.entities[entity] = {
          table: options.entities[entity] || entity
        };
      }
    }
  }

  public sync(method, model, options) {
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
        } else {
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
  }

  protected select(options) {
    this._select(null, options);
  }

  protected drop(options) {
    this._dropTable(options);
  }

  protected createTable(options) {
    this._createTable(options);
  }

  protected execute(options) {
    this._executeSql(options);
  }

  protected _sqlUpdateDatabase(oldVersion, newVersion) {
    // create sql array, simply drop and create the database
    var sql = [];
    for (var entity in this.entities) {
      sql.push(this._sqlDropTable(entity));
      sql.push(this._sqlCreateTable(entity));
    }
    return sql;
  }

  protected _sqlDropTable(entity) {
    return `DROP TABLE IF EXISTS '${this.entities[entity].table}';`;
  }

  protected _sqlCreateTable(entity) {
    return `CREATE TABLE IF NOT EXISTS '${this.entities[entity].table}' (id VARCHAR(255) NOT NULL PRIMARY KEY ASC UNIQUE, data TEXT NOT NULL);`;
  }

  protected _sqlDelete(options, entity) {
    var sql = 'DELETE FROM \'' + this.entities[entity].table + '\'';
    var where = this._sqlWhereFromData(options, entity);
    if (where) {
      sql += ' WHERE ' + where;
    } else {
      diag.debug.assert(() => false, 'attempt of deletion without where clause');
    }
    sql += options.and ? ' AND ' + options.and : '';
    return sql;
  }

  protected _sqlWhereFromData(options, entity) {
    if (options && options.models && entity) {
      var ids = [];
      var that = this;
      _.each(options.models, function (model: Model) {
        if (!model.isNew()) {
          ids.push(that._sqlValue(model.id));
        }
      });
      if (ids.length > 0) {
        return 'id IN (' + ids.join(',') + ')';
      }
    }
    return '';
  }

  protected _sqlSelect(options, entity) {
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
  }

  protected _sqlValue(value) {
    value = _.isNull(value) ? 'null' : _.isObject(value) ? JSON.stringify(value) : value.toString();
    value = value.replace(/"/g, '""');
    return '"' + value + '"';
  }

  protected _dropTable(options) {
    var entity = options.entity;
    if (entity in this.entities && this.entities[entity].created !== false) {
      if (this._checkDb(options)) {
        var sql = this._sqlDropTable(entity);
        // reset flag
        this._executeTransaction(options, [sql]);
      }
    } else {
      // no need dropping as table was not created
      this.handleSuccess(options);
    }
  }

  protected _createTable(options) {
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
  }

  protected _checkTable(options, callback) {
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
    } else {
      // we know it's created already
      callback();
    }
  }

  protected _insertOrReplace(model, options) {
    var entity = options.entity;
    var models = isCollection(model) ? model.models : [model];
    if (this._checkDb(options) && this._checkData(options, models)) {
      var statements = [];
      var sqlTemplate = 'INSERT OR REPLACE INTO \'' + this.entities[entity].table + '\' (';
      for (var i = 0; i < models.length; i++) {
        var amodel = models[i];
        var statement = ''; // the actual sql insert string with values
        if (!amodel.id) {
          amodel.set(amodel.idAttribute, new ObjectID().toHexString());
        }
        var value = options.attrs || amodel.attributes;
        var keys = [ 'id', 'data' ];
        var args = [ amodel.id, JSON.stringify(value) ];
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
  }

  protected _select(model, options) {
    var entity = options.entity;
    if (this._checkDb(options)) {
      var lastStatement;
      var isCollection = !isModel(model);
      var result;
      if (isCollection) {
        result = [];
      } else {
        options.models = [model];
      }
      var stm: any = this._sqlSelect(options, entity);
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
            } catch (e) {
              that.trigger('error', e);
              continue;
            }
            if (isCollection) {
              result.push(attrs);
            } else {
              result = attrs;
              break;
            }
          }
        }, function (t2, e) {
          // error
          diag.debug.error('webSql error: ' + e.message);
        });
      }, function (sqlError) { // errorCallback
        diag.debug.error('WebSql Syntax Error: ' + sqlError.message);
        that.handleError(options, sqlError.message, lastStatement);
      }, function () { // voidCallback (success)
        if (result) {
          if (options.syncContext) {
            result = options.syncContext.processAttributes(result, options);
          }
          that.handleSuccess(options, result);
        } else {
          that.handleError(options, 'no result');
        }
      });
    }
  }

  protected _delete(model, options) {
    var entity = options.entity;
    var models = isCollection(model) ? model.models : [model];
    if (this._checkDb(options)) {
      options.models = models;
      var sql = this._sqlDelete(options, entity);
      // reset flag
      this._executeTransaction(options, [sql], model.toJSON());
    }
  }

  protected _executeSql(options) {
    if (options.sql) {
      this._executeTransaction(options, [options.sql]);
    }
  }

  private transactionPromise = Q.resolve(null);

  protected _executeTransaction(options, statements, result?) {
    if (!this._checkDb(options)) {
      return; // database not open, error was issued by _checkDb() above
    }

    // following sequentially processes transactions avoiding running too many concurrently
    this.transactionPromise = this.transactionPromise.finally(() => {
      var lastStatement;
      return Q.Promise((resolve, reject) => {
        /* transaction has 3 parameters: the transaction callback, the error callback and the success callback */
        return this.db.transaction((t) => {
          return _.each(statements, (stm: any) => {
            var statement = stm.statement || stm;
            var args = stm.arguments;
            lastStatement = statement;

            if (diag.debug.enabled) {
              diag.debug.info('sql statement: ' + statement);
              if (args) {
                diag.debug.trace('    arguments: ' + JSON.stringify(args));
              }
            }

            t.executeSql(statement, args);
          });
        }, reject, resolve);
      }).then(() => {
        return this.handleSuccess(options, result) || null;
      }, (error) => {
        diag.debug.error(error.message);
        return this.handleError(options, error, lastStatement) || null;
      });
    });
  }

  protected _checkDb(options) {
    // has to be initialized first
    if (!this.db) {
      var error = 'db handler not initialized.';
      diag.debug.error(error);
      this.handleError(options, error);
      return false;
    }
    return true;
  }
}

// mixins
let abstractSqlStore = _.extend(AbstractSqlStore.prototype, {
  _type: 'Relution.LiveData.AbstractSqlStore',

  size: 1024 * 1024, // 1 MB
  version: '1.0'
});
diag.debug.assert(() => AbstractSqlStore.prototype.isPrototypeOf(Object.create(abstractSqlStore)));
