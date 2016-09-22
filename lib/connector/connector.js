/*
 * @file connector/connector.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 03.05.2016
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
 * @module connector
 */
/** */
"use strict";
var web = require('../web');
/**
 * endpoint URL of connectors REST API set up by CLI project generation by default.
 *
 * @type {string}
 */
var connectorsUrl = 'api/v1/connectors';
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
function configureSession(name, properties) {
    return web.post(connectorsUrl + '/' + name, properties);
}
exports.configureSession = configureSession;
/**
 * executes a call on a connection.
 *
 * @param name of connection.
 * @param call name.
 * @param input data, i.e. an instance of a model or object compatible to the
 * 		model in terms of attributes defined.
 * @returns promise providing output/error.
 */
function runCall(name, call, input) {
    return web.post(connectorsUrl + '/' + name + '/' + call, input);
}
exports.runCall = runCall;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ubmVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2Nvbm5lY3Rvci9jb25uZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFJTixJQUFZLEdBQUcsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUU5Qjs7OztHQUlHO0FBQ0gsSUFBTSxhQUFhLEdBQUcsbUJBQW1CLENBQUM7QUFFMUM7Ozs7Ozs7Ozs7Ozs7R0FhRztBQUNILDBCQUFpQyxJQUFZLEVBQUUsVUFBZTtJQUM1RCxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEdBQUcsR0FBRyxHQUFHLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztBQUMxRCxDQUFDO0FBRmUsd0JBQWdCLG1CQUUvQixDQUFBO0FBRUQ7Ozs7Ozs7O0dBUUc7QUFDSCxpQkFBd0IsSUFBWSxFQUFFLElBQVksRUFBRSxLQUFVO0lBQzVELE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDbEUsQ0FBQztBQUZlLGVBQU8sVUFFdEIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBjb25uZWN0b3IvY29ubmVjdG9yLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAwMy4wNS4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgY29ubmVjdG9yXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xuXG5pbXBvcnQgKiBhcyB3ZWIgZnJvbSAnLi4vd2ViJztcblxuLyoqXG4gKiBlbmRwb2ludCBVUkwgb2YgY29ubmVjdG9ycyBSRVNUIEFQSSBzZXQgdXAgYnkgQ0xJIHByb2plY3QgZ2VuZXJhdGlvbiBieSBkZWZhdWx0LlxuICpcbiAqIEB0eXBlIHtzdHJpbmd9XG4gKi9cbmNvbnN0IGNvbm5lY3RvcnNVcmwgPSAnYXBpL3YxL2Nvbm5lY3RvcnMnO1xuXG4vKipcbiAqIHByb3ZpZGVzIHBlci11c2VyIGNvbm5lY3Rpb24gcHJvcGVydGllcyB0byBiZSBzdG9yZWQgYXMgcGFydCBvZiB0aGUgc2Vzc2lvbixcbiAqIHN1Y2ggYXMgY3JlZGVudGlhbHMgZm9yIGEgZ2l2ZW4gY29ubmVjdGlvbi5cbiAqXG4gKiA8cD5cbiAqIEFsbCBwYXJhbWV0ZXJzIGluIHByb3BlcnRpZXMgYXJlIGNvcGllZCB0byB0aGUgdHJhbnNpZW50IHNlc3Npb24gc3RvcmUsXG4gKiBvdmVyd3JpdGluZyBhbnkgYWxyZWFkeSBleGlzdGluZyB2YWx1ZXMuIFRvIGRlbGV0ZSBhIHByZXZpb3VzbHkgc3RvcmVkXG4gKiBwYXJhbWV0ZXIsIHByb3ZpZGUgYW4gZW1wdHkgdmFsdWUgZXhwbGljaXRseS5cbiAqIDwvcD5cbiAqXG4gKiBAcGFyYW0gbmFtZSBvZiBjb25uZWN0aW9uLlxuICogQHBhcmFtIHByb3BlcnRpZXMgdG8gc3RvcmUgaW4gc2Vzc2lvbi5cbiAqIEByZXR1cm5zIHByb21pc2Ugb2YgYXN5bmMgZXhlY3V0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29uZmlndXJlU2Vzc2lvbihuYW1lOiBzdHJpbmcsIHByb3BlcnRpZXM6IGFueSk6IFEuUHJvbWlzZTxhbnk+IHtcbiAgcmV0dXJuIHdlYi5wb3N0KGNvbm5lY3RvcnNVcmwgKyAnLycgKyBuYW1lLCBwcm9wZXJ0aWVzKTtcbn1cblxuLyoqXG4gKiBleGVjdXRlcyBhIGNhbGwgb24gYSBjb25uZWN0aW9uLlxuICpcbiAqIEBwYXJhbSBuYW1lIG9mIGNvbm5lY3Rpb24uXG4gKiBAcGFyYW0gY2FsbCBuYW1lLlxuICogQHBhcmFtIGlucHV0IGRhdGEsIGkuZS4gYW4gaW5zdGFuY2Ugb2YgYSBtb2RlbCBvciBvYmplY3QgY29tcGF0aWJsZSB0byB0aGVcbiAqIFx0XHRtb2RlbCBpbiB0ZXJtcyBvZiBhdHRyaWJ1dGVzIGRlZmluZWQuXG4gKiBAcmV0dXJucyBwcm9taXNlIHByb3ZpZGluZyBvdXRwdXQvZXJyb3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBydW5DYWxsKG5hbWU6IHN0cmluZywgY2FsbDogc3RyaW5nLCBpbnB1dDogYW55KTogUS5Qcm9taXNlPGFueT4ge1xuICByZXR1cm4gd2ViLnBvc3QoY29ubmVjdG9yc1VybCArICcvJyArIG5hbWUgKyAnLycgKyBjYWxsLCBpbnB1dCk7XG59XG4iXX0=