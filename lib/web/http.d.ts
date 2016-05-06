import * as Q from 'q';
import * as request from 'request';
import * as http from 'http';
import * as init from '../core/init';
import * as auth from '../security/auth';
/**
 * callback allowing customizing an object not immediately available at time of call.
 *
 * @param promise of deferred object for inspection or customization.
 * @return promise on same deferred object.
 */
export interface HttpCallback<T> {
    (promise: Q.Promise<T>): Q.Promise<T>;
}
/**
 * type representing a raw response.
 */
export declare type HttpResponse = http.IncomingMessage;
/**
 * named parameters of the [[http]] function.
 */
export interface HttpOptions extends request.CoreOptions, request.UrlOptions, init.ServerInitOptions {
    /**
     * optional callback allowing to inspect the server response in more detail than provided by
     * default.
     */
    responseCallback?: HttpCallback<HttpResponse>;
}
/**
 * drives an HTTP request against the Relution server.
 *
 * Behavior of this method is simplified from most HTTP/AJAX implementations:
 * - When the HTTP request succeeds the resulting promise resolves to the response body.
 * - In case of a network Error the promise resolves to an Error object providing `requestUrl`
 *   but neither `statusCode` nor `statusMessage`.
 * - In case of HTTP failure the resulting promise is rejected to an Error-like object carrying
 *   the properties `requestUrl`, `statusCode` and `statusMessage`.
 * - If the server responds a JSON, it is parsed and assumed to be an Error-like object. The object
 *   is augmented by the properties as defined above.
 * - Otherwise the body is stored as `message` of an Error object created. Again, the properties
 *   above are provided.
 * - Finally, in case of HTTP failure with the server not providing any response body, the Error
 *   `message` is set to the `statusMessage`.
 *
 * Thus, to differentiate network failures from server-side failures the `statusCode` of the Error
 * rejection is to being used. For deeper inspection provide an [[options.responseCallback]].
 *
 * @param options of request, including target `url`.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 */
export declare function ajax(options: HttpOptions): Q.Promise<any>;
/**
 * options for use by both [[login]] and [[logout]].
 */
export interface LogonOptions extends init.ServerUrlOptions {
    /**
     * specifies whether login response data is persisted such that subsequent logons can be
     * processed even if communication with the Relution server is impossible at that time.
     *
     * On [[login]] set to `true` to persist the response to offline storage such that
     * subsequent logon to the same server will reuse it even after the client app is restarted.
     * The response data is stored in encrypted form. Once stored, calling [[login]] with the
     * same set of credentials will succeed even if the Relution server can not be reached. In
     * this case, credentials are verified by decryption of the encrypted response data.
     *
     * On [[logout]] set to `true` to ultimately erase the response from offline storage as well,
     * after having it stored using the mechanism described above.
     */
    offlineCapable?: boolean;
}
/**
 * options specific to [[login]] function.
 */
export interface LoginOptions extends LogonOptions, init.ServerInitOptions {
}
/**
 * logs into a Relution server.
 *
 * ```javascript
 * import * as Relution from 'relution-sdk';
 *
 * Relution.init({
 *    serverUrl: 'http://localhost:8080'
 * });
 *
 * let credentials: security.LoginObject = {
 *    userName: 'myusername',
 *    password: 'mypassword'
 * };
 * Relution.web.login(credentials).then(...);
 * ```
 *
 * @param credentials to use.
 * @param loginOptions overwriting [[init]] defaults.
 *
 * @return {Q.Promise<any>} of login response.
 */
export declare function login(credentials: auth.Credentials, loginOptions?: LoginOptions): Q.Promise<any>;
/**
 * options specific to [[logout]] function.
 */
export interface LogoutOptions extends LogonOptions, init.HttpAgentOptions {
}
/**
 * logs out of a Relution server.
 *
 * @param logoutOptions overwriting [[init]] defaults.
 *
 * @return {Q.Promise<any>} of logout response.
 */
export declare function logout(logoutOptions?: LogoutOptions): Q.Promise<any>;