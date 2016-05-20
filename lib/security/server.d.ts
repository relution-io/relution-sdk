import * as init from '../core/init';
import * as auth from './auth';
import * as roles from './roles';
/**
 * computes a url from a given path.
 *
 * - absolute URLs are used as is, e.g.
 *   ``http://192.168.0.10:8080/mway/myapp/api/v1/some_endpoint`` stays as is,
 * - machine-relative URLs beginning with ``/`` are resolved against the Relution server logged
 *   into, so that ``/gofer/.../rest/...``-style URLs work as expected, for example
 *   ``/mway/myapp/api/v1/some_endpoint`` resolves as above when logged into
 *   ``http://192.168.0.10:8080``,
 * - context-relative URLs such as ``api/v1/...`` are resolved using the Relution server logged in,
 *   the ``uniqueName`` of the ``currentOrganization`` and the application name, for example
 *   ``api/v1/some_endpoint`` resolves as above when application myapp logged into
 *   ``http://192.168.0.10:8080`` using a user of organization mway provided currentOrganization
 *   was not changed explicitly to something else.
 *
 * @param path path to resolve.
 * @return {string} absolute URL of path on current server.
 */
export declare function resolveUrl(path: string, options?: init.ServerUrlOptions): string;
/**
 * gets the [[Authorization]] in effect.
 *
 * @return {Authorization} in effect, may be null.
 */
export declare function getCurrentAuthorization(): auth.Authorization;
/**
 * gets the [[Organization]] in effect.
 *
 * @param fields of interest.
 * @return {Organization} in effect, may be null.
 */
export declare function getCurrentOrganization(...fields: string[]): roles.Organization;
/**
 * sets the [[Organization]].
 *
 * @param organization to set.
 */
export declare function setCurrentOrganization(organization: roles.Organization): void;
/**
 * gets the [[User]] in effect.
 *
 * @param fields of interest.
 * @return {User} in effect, may be null.
 */
export declare function getCurrentUser(...fields: string[]): roles.User;
