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

class AuthorizationImpl implements Authorization {
  public name: string;
  public roles: string[];

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
    this.roles = roles; // never null thanks to TypeScript
    if (_.isString(jsonOrName)) {
      this.name = jsonOrName;
    } else if (jsonOrName) {
      _.assign(this, jsonOrName);
      assert.equal(roles.length, 0, 'roles argument can not be used with json');
      assert(_.isArray(this.roles), 'roles literal must be an array');
    }
  }

  /**
   * turns the object immutable.
   *
   * @return {AuthorizationImpl} this for convenience of fluent API.
   */
  public freeze(): Authorization {
    this.roles = Object.freeze(this.roles);
    return Object.freeze(this);
  }
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
export const ANONYMOUS_AUTHORIZATION = new AuthorizationImpl(void 0, USER_ANYONE).freeze();

/**
 * storage of [[Authorization]] in effect.
 *
 * @type {Authorization} in effect, never null.
 */
let currentAuthorization = ANONYMOUS_AUTHORIZATION;
/**
 * gets the [[currentAuthorization]] in effect.
 *
 * @return {Authorization} in effect, never null.
 */
export function getCurrentAuthorization(): Authorization {
  return currentAuthorization;
}
/**
 * sets the [[currentAuthorization]].
 *
 * @param authorization to set.
 *
 * @internal for library use only!
 */
export function setCurrentAuthorization(authorization: Authorization) {
  if (authorization instanceof AuthorizationImpl) {
    currentAuthorization = authorization;
  } else if (authorization) {
    currentAuthorization = new AuthorizationImpl(authorization).freeze();
  } else {
    currentAuthorization = ANONYMOUS_AUTHORIZATION;
  }
}
