/**
 * @file connector/connector.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 03.05.2016
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
