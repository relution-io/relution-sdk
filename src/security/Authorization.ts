/**
 * @file security/Authorization.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.04.2016
 * Copyright (c)
 * 2016
 * M-Way Solutions GmbH. All rights reserved.
 * http://www.mwaysolutions.com
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

import * as _ from 'lodash';
import * as assert from 'assert';

/**
 * some JSON literal of key/value pairs representing credentials.
 */
export interface Credentials {
  [key: string]: any;
  [index: number]: any;
};
/**
 * version of [[Credentials]] used by Relution server.
 */
export interface LoginObject extends Credentials {
  userName?: string;
  orgaName?: string;
  password?: string;
  /**
   * used only if [[userName]] is not set.
   */
  email?: string;
}

/**
 * provides access control related information.
 */
export interface Authorization {
  /**
   * the *UUID* of the user represented.
   *
   * Notice, only the [[ANONYMOUS_AUTHORIZATION]] does not specify a name.
   */
  name?: string;
  /**
   * security roles the user belongs to, never null.
   */
  roles: string[];
}

/**
 * turns the object deeply immutable.
 *
 * @param authorization to freeze.
 * @return {Authorization} authorization for convenience.
 *
 * @internal for library use only.
 */
export function freezeAuthorization(authorization: Authorization): Authorization {
  authorization.roles = Object.freeze(authorization.roles);
  return Object.freeze(this);
}

/**
 * Virtual role for all authenticated users.
 */
export const ROLE_AUTHENTICATED = 'user.authenticated';
/**
 * Administrator's role name. Users in this role should have full access to
 * all services in the system.
 */
export const ROLE_ADMIN = 'ADMIN';
/**
 * The name of the predefined role, user.anyone, that all users and groups
 * belong to.
 */
export const USER_ANYONE	= 'user.anyone';
/**
 * immutable [[Authorization]] representing the anonymous user.
 *
 * @type {Authorization}
 */
export const ANONYMOUS_AUTHORIZATION = freezeAuthorization({
  name: void 0,
  roles: [
    USER_ANYONE
  ]
});

/**
 * explicit class allowing to provide additional management capability.
 *
 * @internal intended for library extensibility only.
 */
class AuthorizationImpl {
  private authorization: Authorization = {
    name: ANONYMOUS_AUTHORIZATION.name,
    roles: ANONYMOUS_AUTHORIZATION.roles
  };

  /**
   * copy-constructs a deeply independent and mutable copy.
   *
   * @param json to copy.
   */
  constructor(json: Authorization);
  /**
   * explicitly initializes an instance.
   *
   * @param name stored in instance, the *UUID* of a user.
   * @param roles of user.
     */
  constructor(name: string, ...roles: string[]);
  /**
   * @internal overloaded constructor.
   */
  constructor(jsonOrName: string | Authorization, ...roles: string[]) {
    let authorization = this.authorization;
    authorization.roles = roles; // never null thanks to TypeScript
    if (_.isString(jsonOrName)) {
      authorization.name = jsonOrName;
    } else if (jsonOrName) {
      _.assign(authorization, jsonOrName);
      assert.equal(roles.length, 0, 'roles argument can not be used with json');
      assert(_.isArray(authorization.roles), 'roles literal must be an array');
    }
    this.authorization = freezeAuthorization(authorization);
  }

  /**
   * when stringifying all management data must be erased!
   *
   * @return {{name: string, roles: string[]}} minimal information only.
   */
  public toJSON(): Authorization {
    return this.authorization;
  }
}

/**
 * storage of [[Authorization]] in effect.
 *
 * @type {Authorization} in effect, never null.
 */
let currentAuthorization = new AuthorizationImpl(null);
/**
 * gets the [[currentAuthorization]] in effect.
 *
 * @return {Authorization} in effect, never null.
 */
export function getCurrentAuthorization(): Authorization {
  return currentAuthorization.toJSON();
}
/**
 * sets the [[currentAuthorization]].
 *
 * @param authorization to set.
 *
 * @internal for library use only!
 */
export function setCurrentAuthorization(authorization?: Authorization | AuthorizationImpl) {
  if (authorization instanceof AuthorizationImpl) {
    currentAuthorization = authorization;
  } else {
    currentAuthorization = new AuthorizationImpl(authorization);
  }
}
