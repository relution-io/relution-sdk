/**
 * @file livedata/Object.ts
 * Relution SDK
 *
 * Created by M-Way on 27.06.2016
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

import * as diag from '../core/diag';

export function _create(args) {
  return new this(args);
}

export function _design(obj) {
  var O = this.extend(obj || {});
  return new O();
}

export const _extend = Backbone.Model.extend;

export class _Object {
  /**
   * The type of this object.
   *
   * @type String
   */
  _type = 'Relution.LiveData._Object';

  /**
   * Creates an object based on a passed prototype.
   *
   * @param {Object} proto The prototype of the new object.
   */
  _create(proto) {
    var F = function () {
    };
    F.prototype = proto;
    return new F();
  }

  /**
   * Includes passed properties into a given object.
   *
   * @param {Object} properties The properties to be included into the given object.
   */
  include(properties) {
    for (var prop in properties) {
      diag.debug.assert(() => !this.hasOwnProperty(prop));
      this[prop] = properties[prop];
    }
    return this;
  }

  /**
   * Creates a new class and extends it with all functions of the defined super class
   * The function takes multiple input arguments. Each argument serves as additional
   * super classes - see mixins.
   *
   * @param {Object} properties The properties to be included into the given object.
   */
  design(properties) {
    // create the new object
    var obj = this._create(this);

    // assign the properties passed with the arguments array
    obj.include(properties);

    // return the new object
    return obj;
  }

  /**
   * Binds a method to its caller, so it is always executed within the right scope.
   *
   * @param {Object} caller The scope of the method that should be bound.
   * @param {Function} method The method to be bound.
   * @param {Object} arg One or more arguments. If more, then apply is used instead of call.
   */
  bindToCaller(caller, method, arg) {
    return function () {
      diag.debug.assert(() => typeof method === 'function');
      diag.debug.assert(() => typeof caller === 'object');
      if (Array.isArray(arg)) {
        return method.apply(caller, arg);
      }
      return method.call(caller, arg);
    };
  }

  /**
   * Calls a method defined by a handler
   *
   * @param {Object} handler A function, or an object including target and action to use with bindToCaller.
   */
  handleCallback(handler) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (handler) {
      var target = typeof handler.target === 'object' ? handler.target : this;
      var action = handler;
      if (typeof handler.action === 'function') {
        action = handler.action;
      } else if (typeof handler.action === 'string') {
        action = target[handler.action];
      }
      if (typeof action === 'function') {
        return this.bindToCaller(target, action, args)();
      }
    }
  }

}
