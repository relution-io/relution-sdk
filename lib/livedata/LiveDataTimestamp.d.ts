import { Model } from './Model';
/**
 * used to persist last message timestamp data.
 *
 * @module Relution.livedata.LiveDataTimestamp
 *
 * @type {*}
 */
export interface LiveDataTimestamp {
    /**
     * channel the timestamp belongs to.
     */
    channel: string;
    /**
     * value stored.
     */
    timestamp: number;
}
/**
 * timestamp packed into a Model.
 *
 * @module Relution.livedata.LiveDataTimestamp
 *
 * @type {*}
 */
export declare class LiveDataTimestampModel extends Model {
    /**
     * redefined to concrete type of attributes.
     */
    attributes: LiveDataTimestamp;
}
