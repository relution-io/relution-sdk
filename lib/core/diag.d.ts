import * as assert from 'assert';
/**
 * expression validating an assumption of the calling code, typically an arrow-function expression.
 */
export interface AssertionCheck {
    (): boolean;
}
/**
 * subtype of Error thrown by assert() in case AssertionCheck fails.
 */
export declare type AssertionError = assert.AssertionError;
/**
 * enables/disables assertion testing at runtime.
 *
 * <p>
 * When undefined, isDebugMode() controls whether assertions are validated.
 * </p>
 */
export declare let assertions: boolean;
export interface LogFunc {
    (message: string, ...parameters: any[]): void;
}
/**
 * console featuring coloring, fontSize and enabled state.
 */
export declare class Diagnostics {
    private static STUB();
    private fontSize_;
    private enabled_;
    constructor(enabled?: boolean, fontSize?: string);
    private reset();
    enabled: boolean;
    fontSize: string;
    log: LogFunc;
    trace: LogFunc;
    debug: LogFunc;
    info: LogFunc;
    warn: LogFunc;
    warning: LogFunc;
    error: LogFunc;
    /**
     * uses toSource() if available, falling back to toString() otherwise.
     *
     * @param func to generate source of.
     * @return {string} of func.
       */
    private static toSource(func);
    /**
     * evaluates given check expression as a strong invariant never ever violated.
     *
     * <p>
     * Use assert to ensure an assumption at runtime. When running with assertions enabled, the
     * check expression is evaluated immediately. A check expression evaluating to false signals a
     * violation of invariant that should never happen. If it does, a hard error is output
     * unconditionally to the console and an AssertionError is thrown.
     * </p>
     * <p>
     * Do not use assertions as a means of ordinary error checking. Here are some valid examples of
     * assertions:
     * <pre>
     *     assert(() => Date.now() > 0, 'current time millis can not be before 1970 start of time!');
     *     assert(() => total_price >= item_price,
     *                  'total is sum of individual prices and thus can not be less than each one!');
     *     assert(() => num*num >= 0, 'squared num is less than zero!');
     * </pre>
     * </p>
     *
     * @param check expression validating an assumption of the calling code, typically an
     *    arrow-function expression.
     * @param message optional explanation of disaster.
     */
    assert(check: AssertionCheck | boolean, message?: string): void;
    /**
     * used in catch-blocks or Promise rejection callbacks to ensure the caught value is an Error.
     *
     * @param error to check.
     * @param message of disaster.
     * @return {any} value evaluating to true stating error is an instance of Error.
     */
    assertIsError(error: any, message?: string): error is Error;
}
export declare const debug: Diagnostics;
