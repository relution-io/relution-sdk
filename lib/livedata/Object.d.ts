export declare function _create(args: any): any;
export declare function _design(obj: any): any;
export declare const _extend: any;
export declare class _Object {
    /**
     * The type of this object.
     *
     * @type String
     */
    _type: string;
    /**
     * Creates an object based on a passed prototype.
     *
     * @param {Object} proto The prototype of the new object.
     */
    _create(proto: any): any;
    /**
     * Includes passed properties into a given object.
     *
     * @param {Object} properties The properties to be included into the given object.
     */
    include(properties: any): this;
    /**
     * Creates a new class and extends it with all functions of the defined super class
     * The function takes multiple input arguments. Each argument serves as additional
     * super classes - see mixins.
     *
     * @param {Object} properties The properties to be included into the given object.
     */
    design(properties: any): any;
    /**
     * Binds a method to its caller, so it is always executed within the right scope.
     *
     * @param {Object} caller The scope of the method that should be bound.
     * @param {Function} method The method to be bound.
     * @param {Object} arg One or more arguments. If more, then apply is used instead of call.
     */
    bindToCaller(caller: any, method: any, arg: any): () => any;
    /**
     * Calls a method defined by a handler
     *
     * @param {Object} handler A function, or an object including target and action to use with bindToCaller.
     */
    handleCallback(handler: any): any;
}
