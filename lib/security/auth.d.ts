/**
 * @file security/Authorization.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.04.2016
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
 * some JSON literal of key/value pairs representing credentials.
 */
export interface Credentials {
    [key: string]: any;
    [index: number]: any;
}
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
export declare function cloneCredentials<CredentialsT extends Credentials>(credentials: CredentialsT): CredentialsT;
export declare function freezeCredentials<CredentialsT extends Credentials>(credentials: CredentialsT): CredentialsT;
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
 * Virtual role for all authenticated users.
 */
export declare const ROLE_AUTHENTICATED: string;
/**
 * Administrator's role name. Users in this role should have full access to
 * all services in the system.
 */
export declare const ROLE_ADMIN: string;
/**
 * The name of the predefined role, user.anyone, that all users and groups
 * belong to.
 */
export declare const USER_ANYONE: string;
/**
 * immutable [[Authorization]] representing the anonymous user.
 *
 * @type {Authorization}
 */
export declare const ANONYMOUS_AUTHORIZATION: Authorization;
