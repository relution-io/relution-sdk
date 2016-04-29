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
/**
 * gets the [[currentAuthorization]] in effect.
 *
 * @return {Authorization} in effect, never null.
 */
export declare function getCurrentAuthorization(): Authorization;
