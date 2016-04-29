/**
 * compiled JSON path expression.
 *
 * @see http://goessner.net/articles/JsonPath/
 * @see https://libraries.io/bower/JSONPath
 */
export declare class JsonPath {
    /**
     * normalized JSON path expression.
     */
    private expression;
    /**
     * whether the expression is a simple property access.
     */
    private simple;
    /**
     * constructs a compiled expression.
     *
     * @param expression to compile.
     */
    constructor(expression: string);
    /**
     * evaluates the expression on a target object.
     *
     * @param obj to evaluate expression on.
     * @param arg options object.
     * @return{any} result of evaluating expression on object.
     */
    evaluate(obj: any, arg?: {}): any;
}
