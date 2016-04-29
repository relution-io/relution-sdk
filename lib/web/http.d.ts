import * as request from 'request';
import * as http from 'http';
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
export interface HttpOptions extends request.CoreOptions, request.UrlOptions {
    /**
     * optional callback allowing to inspect the server response in more detail than provided by
     * default.
     */
    responseCallback?: HttpCallback<HttpResponse>;
}
/**
 * drives an HTTP request against the Relution server.
 *
 * @param options of request, including target `url`.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `statusCode` and `statusMessage`.
 */
export declare function http(options: HttpOptions): Q.Promise<any>;
