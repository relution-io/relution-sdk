/**
 * @module connector
 */
/** */
import * as Q from 'q';
/**
 * provides per-user connection properties to be stored as part of the session,
 * such as credentials for a given connection.
 *
 * <p>
 * All parameters in properties are copied to the transient session store,
 * overwriting any already existing values. To delete a previously stored
 * parameter, provide an empty value explicitly.
 * </p>
 *
 * @param name of connection.
 * @param properties to store in session.
 * @returns promise of async execution.
 */
export declare function configureSession(name: string, properties: any): Q.Promise<any>;
/**
 * executes a call on a connection.
 *
 * @param name of connection.
 * @param call name.
 * @param input data, i.e. an instance of a model or object compatible to the
 * 		model in terms of attributes defined.
 * @returns promise providing output/error.
 */
export declare function runCall(name: string, call: string, input: any): Q.Promise<any>;
