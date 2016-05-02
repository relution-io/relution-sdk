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
