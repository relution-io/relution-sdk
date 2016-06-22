import * as Q from 'q';
import * as request from 'request';
import * as http from 'http';
import * as init from '../core/init';
import * as auth from '../security/auth';
/**
 * callback allowing customizing an object not immediately available at time of call.
 *
 * @param object for inspection or customization.
 * @return promise or object on same deferred object.
 */
export interface HttpCallback<T> {
    (value: T): Q.Promise<T> | T;
}
/**
 * type representing a raw request.
 */
export declare type HttpRequest = request.Request;
/**
 * type representing a raw response.
 */
export declare type HttpResponse = http.IncomingMessage;
/**
 * named parameters of the [[http]] function.
 */
export interface HttpOptions extends request.CoreOptions, request.UrlOptions, init.ServerInitOptions {
    /**
     * optional callback allowing to customize the client request in more detail than provided by
     * default.
     */
    requestCallback?: HttpCallback<HttpRequest>;
    /**
     * optional callback allowing to inspect the server response in more detail than provided by
     * default.
     */
    responseCallback?: HttpCallback<HttpResponse>;
}
/**
 * failure of an ajax request.
 *
 * This type can be used as type annotation of the error the Promise returned by ajax is rejected
 * with.
 *
 * @see ajax
 */
export interface HttpError extends Error {
    /**
     * fully resolved url the request was sent to.
     */
    requestUrl?: string;
    /**
     * HTTP status code of failure.
     */
    statusCode?: number;
    /**
     * HTTP status message of failure.
     */
    statusMessage?: string;
    /**
     * in many cases the Relution server reports here the fully qualified name of a Java Exception
     * that may be used to further differentiate the error.
     */
    className?: string;
    /**
     * details of request failed.
     *
     * This is a non-enumerable property and thus not part of the JSON representation of the failure.
     * It is provided for informal purposes as a debugging aid only. Client code should not rely on
     * this value.
     *
     * @see response
     */
    rawRequest?: HttpRequest;
    /**
     * details of response failed.
     *
     * This is a non-enumerable property and thus not part of the JSON representation of the failure.
     * It is provided for informal purposes as a debugging aid only. Client code should not rely on
     * this value.
     *
     * @see request
     */
    rawResponse?: HttpResponse;
}
/**
 * drives an HTTP request against the Relution server.
 *
 * Behavior of this method is simplified from most HTTP/AJAX implementations:
 * - When the HTTP request succeeds the resulting promise resolves to the response body.
 * - In case of a network Error the promise resolves to an HttpError object providing `requestUrl`
 *   but neither `statusCode` nor `statusMessage`.
 * - In case of HTTP failure the resulting promise is rejected to an HttpError-like object carrying
 *   the properties `requestUrl`, `statusCode` and `statusMessage`.
 * - If the server responds a JSON, it is parsed and assumed to be an HttpError-like object. The
 *   object is augmented by the properties as defined above.
 * - Otherwise the body is stored as `message` of an HttpError object created. Again, the properties
 *   above are provided.
 * - Finally, in case of HTTP failure with the server not providing any response body, the HttpError
 *   `message` is set to the `statusMessage`.
 *
 * Thus, to differentiate network failures from server-side failures the `statusCode` of the
 * HttpError rejection is to being used. For deeper inspection provide an
 * [[options.responseCallback]].
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
 *  .catch((e:Relution.web.HttpError) => console.error(e.message, e))
 *  .finally(() => console.log('loading complete!'));
 *
 * // as Observable
 * Observable.fromPromise(Relution.web.ajax(httpOptions)).subscribe(
 *  (resp: any) => console.log('posts', resp),
 *  (e:Relution.web.HttpError) => console.error(e.message, e);,
 *  () => console.log('loading complete!')
 * )
 * ```
 * @param options of request, including target `url`.
 * @return {Q.Promise} of response body, in case of failure rejects to an HttpError object
 *    including `requestUrl`, `statusCode` and `statusMessage`.
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
