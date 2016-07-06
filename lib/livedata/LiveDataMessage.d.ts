import { Model } from './Model';
/**
 * an offline message of the client or a change message of the server.
 */
export interface LiveDataMessage {
    /**
     * primary key of the message.
     *
     * <p>
     * For offline messages stored on the client-side the key is of the form entity~id. The entity prefix
     * is required in order to compose a unique key in the rare event of using the same id value in
     * different entities. Notice, the combination is unique because offline messages targeting the same
     * record are merged resulting in just one change.
     * </p>
     * <p>
     * For transient (not stored) offline messages on the client-side the value is not present.
     * </p>
     * <p>
     * For changes reported by the server-side an explicit _id value is used, which is of no concern to
     * the client except for diagnostics as a debugging aid.
     * </p>
     */
    _id?: string;
    /**
     * original key of the target record being altered.
     */
    id: string;
    /**
     * CRUD-method of how the record is altered.
     *
     * <p>
     * This can be one of read, create, update, patch or delete only.
     * </p>
     */
    method: string;
    /**
     * point in time of alteration.
     */
    time: number;
    /**
     * actual attribute data being set (patch => merged) on target model in format suitable for model.set() call.
     */
    data: any;
    /**
     * offline messages are replayed in sort order of increasing priority followed by increasing time.
     *
     * <p>
     * The priority assigned is based on the SyncEndpoint (aka. entity). By default, all entites are of equal priority
     * so that messages are replayed in causal order. The priority may be changed to account for foreign key id
     * references among the entities. When this is done, entities with lower priority values are propagated to the
     * server before messages of higher order, independent of their timely order.
     * </p>
     * <p>
     * An example are customer accounts which must be created before creation of shopping card orders.
     * </p>
     */
    priority?: number;
}
/**
 * message packed into a Model.
 *
 * @module Relution.livedata.LiveDataMessage
 *
 * @type {*}
 */
export declare class LiveDataMessageModel extends Model {
    /**
     * redefined to concrete type of attributes.
     */
    attributes: LiveDataMessage;
}
