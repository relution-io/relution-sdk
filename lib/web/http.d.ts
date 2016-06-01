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
 * ```javascript
 * Relution.init({
 *    serverUrl: 'http://localhost:8080',
 *    organization: 'myOrga'
 * });
 *
 * let httpOptions: HttpOptions = {method: 'GET', url: 'api/v1/posts'};
 *
 * //usage as Promise
 * Relution.web.ajax(httpOptions)
 *  .then((resp) => console.log('posts', resp);)
 *  .catch((e:Error) => console.error(e.message, e))
 *  .finally(() => console.log('loading complete!'));
 *
 * // as Observable
 * Observable.fromPromise(Relution.web.ajax(httpOptions)).subscribe(
 *  (resp: any) => console.log('posts', resp),
 *  (e:Error) => console.error(e.message, e);,
 *  () => console.log('loading complete!')
 * )
 * ```
 * @param options of request, including target `url`.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 */
export declare function ajax(options: HttpOptions): Q.Promise<any>;
/**
 * issues an http/ajax HEAD request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see get
 * @see put
 * @see post
 * @see patch
 * @see delete
 *
 * @see ajax
 */
export declare function head(optionsOrUrl: HttpOptions | string): Q.Promise<any>;
/**
 * issues an http/ajax GET request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see put
 * @see post
 * @see patch
 * @see delete
 *
 * @see ajax
 */
export declare function get(optionsOrUrl: HttpOptions | string): Q.Promise<any>;
/**
 * issues an http/ajax PUT request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see post
 * @see patch
 * @see delete
 *
 * @see ajax
 */
export declare function put(optionsOrUrl: HttpOptions | string, body?: any): Q.Promise<any>;
/**
 * issues an http/ajax POST request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see put
 * @see patch
 * @see delete
 *
 * @see ajax
 */
export declare function post(optionsOrUrl: HttpOptions | string, body?: any): Q.Promise<any>;
/**
 * issues an http/ajax PATCH request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see put
 * @see post
 * @see delete
 *
 * @see ajax
 */
export declare function patch(optionsOrUrl: HttpOptions | string, body?: any): Q.Promise<any>;
/**
 * issues an http/ajax DELETE request against the Relution server.
 *
 * <p>
 * Please consider this export as an implementation detail of the library and use delete instead.
 * </p>
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see put
 * @see post
 * @see patch
 * @see delete
 *
 * @see ajax
 */
export declare function del(optionsOrUrl: HttpOptions | string, body?: any): Q.Promise<any>;
/**
 * issues an http/ajax DELETE request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see put
 * @see post
 * @see patch
 *
 * @see ajax
 */
export { del as delete };
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
 * //config
 * Relution.init({
 *    serverUrl: 'http://localhost:8080'
 * });
 *
 * let credentials = {
 *    userName: 'myusername',
 *    password: 'mypassword'
 * };
 *
 * //usage
 *
 * // Promise
 * Relution.web.login(credentials)
 *  .then((resp) => console.log('resp', resp);)
 *  .catch((e:Error) => console.error(e.message, e))
 *  .finally(() => console.log('complete'));
 *
 * //Observable
 * Observable.fromPromise(Relution.web.login(credentials)).subscribe(
 *  (resp: any) => console.log('resp', resp),
 *  (e:Error) => console.error(e.message, e);,
 *  () => console.log('complete')
 * )
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
 * ```javascript
 *
 * Relution.web.logout()
 *  .then((resp) => console.log('resp', resp);)
 *  .catch((e:Error) => console.error(e.message, e))
 *  .finally(() => console.log('bye bye'));
 *
 * //Observable
 * Observable.fromPromise(Relution.web.logout()).subscribe(
 *  (resp: any) => console.log('resp', resp),
 *  (e:Error) => console.error(e.message, e);,
 *  () => console.log('bye bye')
 * )
 * ```
 * @return {Q.Promise<any>} of logout response.
 */
export declare function logout(logoutOptions?: LogoutOptions): Q.Promise<any>;
