import * as init from '../core/init';
/**
 * computes a server url from a given path.
 *
 * @param path path to resolve, relative or absolute.
 * @param options of server in effect.
 * @return {string} absolute URL of server.
 */
export declare function resolveServer(path: string, options?: init.ServerUrlOptions): string;
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
 * @param options of server in effect.
 * @return {string} absolute URL of path on current server.
 */
export declare function resolveUrl(path: string, options?: init.ServerUrlOptions): string;
/**
 * computes the basepath of a BaaS application.
 *
 * @param baseAliasOrNameOrApp baseAlias of application, may be name when baseAlias is not changed
 *    by developer or application metadata object of Relution server.
 * @param options of server in effect.
 * @return {string} absolute URL of application alias on current server.
 */
export declare function resolveApp(baseAliasOrNameOrApp: any, options?: init.ServerUrlOptions): string;
