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

import * as _ from 'lodash';

import * as diag from '../core/diag';

import {AbstractSqlStore} from './AbstractSqlStore';

/**
 * openDatabase of browser or via require websql.
 *
 * @internal Not public API, exported for testing purposes only!
 */
export const openDatabase = global['openDatabase'] && // native implementation
  global['openDatabase'].bind(global) ||              // must be bound
  process && !process['browser'] &&                   // or when not in browser
  (global['openDatabase'] = require('websql'));       // required version

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
export class WebSqlStore extends AbstractSqlStore {
  constructor(options?: any) {
    super(options);

    var that = this;
    this._openDb({
      error: function (error) {
        diag.debug.error(error);
        that.trigger('error', error);
      }
    });
  }

  /**
   * @private
   */
  private _openDb(options) {
    var error, dbError;
    /* openDatabase(db_name, version, description, estimated_size, callback) */
    if (!this.db) {
      try {
        if (!openDatabase) {
          error = 'Your browser does not support WebSQL databases.';
        } else {
          this.db = openDatabase(this.name, '', '', this.size);
          if (this.entities) {
            for (var entity in this.entities) {
              this._createTable({ entity: entity });
            }
          }
        }
      } catch (e) {
        dbError = e;
      }
    }
    if (this.db) {
      if (this.version && this.db.version !== this.version && this.db.changeVersion) {
        this._updateDb(options);
      } else {
        this.handleSuccess(options, this.db);
      }
    } else if (dbError === 2 || dbError === '2') {
      // Version number mismatch.
      this._updateDb(options);
    } else {
      if (!error && dbError) {
        error = dbError;
      }
      this.handleSuccess(options, error);
    }
  }

  private _updateDb(options) {
    var error;
    var lastSql;
    var that = this;
    try {
      if (!this.db) {
        this.db = openDatabase(this.name, '', '', this.size);
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
          } else {
            that.handleError(options, err.message, lastSql);
          }
        }, function () {
          that.handleSuccess(options, that.db);
        });
      } catch (e) {
        error = e.message;
        diag.debug.error('webSql change version failed, DB-Version: ' + this.db.version);
      }
    } catch (e) {
      error = e.message;
    }
    if (error) {
      this.handleError(options, error);
    }
  }

  public close() {
    diag.debug.info('WebSQL Store close');
    if (this.db) {
      this.db = null;
    }
  }
}

// mixins
let webSqlStore = _.extend(WebSqlStore.prototype, {
  _type: 'Relution.LiveData.WebSqlStore'
});
diag.debug.assert(() => WebSqlStore.prototype.isPrototypeOf(Object.create(webSqlStore)));
