/*
 * @file livedata/SyncEndpoint.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 07.12.2015
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
 * @module livedata
 */
/** */
"use strict";
var url = require('url');
/**
 * very simple hash coding implementation.
 *
 * @internal For library use only.
 */
function hashCode() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i - 0] = arguments[_i];
    }
    var hash = 0;
    for (var i = 0; i < args.length; ++i) {
        var str = args[i] || '';
        for (var j = 0, l = str.length; j < l; ++j) {
            var char = str.charCodeAt(j);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
    }
    return hash;
}
exports.hashCode = hashCode;
/**
 * manages connection of SyncStore to one entity.
 */
var SyncEndpoint = (function () {
    function SyncEndpoint(options) {
        this.isConnected = null;
        this.entity = options.entity;
        this.modelType = options.modelType;
        this.urlRoot = options.urlRoot;
        this.socketPath = options.socketPath;
        this.userUuid = options.userUuid;
        var href = url.parse(options.urlRoot);
        this.host = href.protocol + '//' + href.hostname;
        if (!href.port) {
            // socket.io needs port event for standard protocols
            if (href.protocol === 'https:') {
                this.host += ':443';
            }
            else if (href.protocol === 'http:') {
                this.host += ':80';
            }
        }
        this.path = href.pathname;
        var user = options.userUuid ? options.userUuid + '/' : '';
        var name = options.entity;
        var hash = hashCode(this.host);
        this.channel = user + name + '/' + hash;
    }
    /**
     * close the endpoint explicit.
     */
    SyncEndpoint.prototype.close = function () {
        if (this.socket) {
            // consider calling this.socket.close() instead
            this.socket.socket.close();
            this.socket = null;
        }
        if (this.localStore) {
            this.localStore.close();
            this.localStore = null;
        }
    };
    return SyncEndpoint;
}());
exports.SyncEndpoint = SyncEndpoint;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY0VuZHBvaW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL1N5bmNFbmRwb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksR0FBRyxXQUFNLEtBQUssQ0FBQyxDQUFBO0FBTTNCOzs7O0dBSUc7QUFDSDtJQUF5QixjQUFpQjtTQUFqQixXQUFpQixDQUFqQixzQkFBaUIsQ0FBakIsSUFBaUI7UUFBakIsNkJBQWlCOztJQUN4QyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7SUFDYixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUNyQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3hCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDM0MsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDbkMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLDJCQUEyQjtRQUN4QyxDQUFDO0lBQ0gsQ0FBQztJQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBWGUsZ0JBQVEsV0FXdkIsQ0FBQTtBQUVEOztHQUVHO0FBQ0g7SUE0QkUsc0JBQVksT0FNWDtRQXZCTSxnQkFBVyxHQUFvQixJQUFJLENBQUM7UUF3QnpDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM3QixJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDbkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1FBQy9CLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztRQUNyQyxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFFakMsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQ2pELEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDZixvREFBb0Q7WUFDcEQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixJQUFJLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQztZQUN0QixDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDckMsSUFBSSxDQUFDLElBQUksSUFBSSxLQUFLLENBQUM7WUFDckIsQ0FBQztRQUNILENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFFMUIsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDMUQsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUMxQixJQUFJLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO0lBQzFDLENBQUM7SUFFRDs7T0FFRztJQUNJLDRCQUFLLEdBQVo7UUFDRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNoQiwrQ0FBK0M7WUFDekMsSUFBSSxDQUFDLE1BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDckIsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDekIsQ0FBQztJQUNILENBQUM7SUFDSCxtQkFBQztBQUFELENBQUMsQUF6RUQsSUF5RUM7QUF6RVksb0JBQVksZUF5RXhCLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgbGl2ZWRhdGEvU3luY0VuZHBvaW50LnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAwNy4xMi4yMDE1XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcbiAqL1xuLyoqICovXG5cbmltcG9ydCAqIGFzIHVybCBmcm9tICd1cmwnO1xuXG5pbXBvcnQge1N0b3JlfSBmcm9tICcuL1N0b3JlJztcbmltcG9ydCB7TW9kZWwsIE1vZGVsQ3Rvcn0gZnJvbSAnLi9Nb2RlbCc7XG5pbXBvcnQge0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xuLyoqXG4gKiB2ZXJ5IHNpbXBsZSBoYXNoIGNvZGluZyBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBAaW50ZXJuYWwgRm9yIGxpYnJhcnkgdXNlIG9ubHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNoQ29kZSguLi5hcmdzOiBzdHJpbmdbXSkge1xuICB2YXIgaGFzaCA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBzdHIgPSBhcmdzW2ldIHx8ICcnO1xuICAgIGZvciAodmFyIGogPSAwLCBsID0gc3RyLmxlbmd0aDsgaiA8IGw7ICsraikge1xuICAgICAgdmFyIGNoYXIgPSBzdHIuY2hhckNvZGVBdChqKTtcbiAgICAgIGhhc2ggPSAoKGhhc2ggPDwgNSkgLSBoYXNoKSArIGNoYXI7XG4gICAgICBoYXNoIHw9IDA7IC8vIENvbnZlcnQgdG8gMzJiaXQgaW50ZWdlclxuICAgIH1cbiAgfVxuICByZXR1cm4gaGFzaDtcbn1cblxuLyoqXG4gKiBtYW5hZ2VzIGNvbm5lY3Rpb24gb2YgU3luY1N0b3JlIHRvIG9uZSBlbnRpdHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBTeW5jRW5kcG9pbnQge1xuXG4gIHB1YmxpYyBlbnRpdHk6IHN0cmluZztcbiAgcHVibGljIG1vZGVsVHlwZTogTW9kZWxDdG9yO1xuICBwdWJsaWMgdXJsUm9vdDogc3RyaW5nO1xuICBwdWJsaWMgc29ja2V0UGF0aDogc3RyaW5nO1xuICBwdWJsaWMgdXNlclV1aWQ6IHN0cmluZztcblxuICBwdWJsaWMgaG9zdDogc3RyaW5nO1xuICBwdWJsaWMgcGF0aDogc3RyaW5nO1xuICBwdWJsaWMgY2hhbm5lbDogc3RyaW5nO1xuICBwdWJsaWMgaXNDb25uZWN0ZWQ6IFEuUHJvbWlzZTx2b2lkPiA9IG51bGw7XG5cbiAgcHVibGljIGxvY2FsU3RvcmU6IFN0b3JlO1xuICBwdWJsaWMgaW5mbzogUS5Qcm9taXNlPE1vZGVsPjtcbiAgcHVibGljIHByaW9yaXR5OiBudW1iZXI7XG4gIHB1YmxpYyBzb2NrZXQ6IFNvY2tldElPQ2xpZW50LlNvY2tldDtcblxuICAvLyBwcm9taXNlIG9mIGxhc3QgU3luY1N0b3JlLmZldGNoQ2hhbmdlc1xuICBwdWJsaWMgcHJvbWlzZUZldGNoaW5nQ2hhbmdlczogUS5Qcm9taXNlPENvbGxlY3Rpb24+O1xuICAvLyB0aW1lc3RhbXAgb2YgbGFzdCBTeW5jU3RvcmUuZmV0Y2hDaGFuZ2VzLCAwIHdoaWxlIHJlcXVlc3QgaXMgb3V0c3RhbmRpbmdcbiAgcHVibGljIHRpbWVzdGFtcEZldGNoaW5nQ2hhbmdlczogbnVtYmVyO1xuXG4gIC8vIHByb21pc2Ugb2YgbGFzdCBTeW5jU3RvcmUuZmV0Y2hTZXJ2ZXJJbmZvXG4gIHB1YmxpYyBwcm9taXNlRmV0Y2hpbmdTZXJ2ZXJJbmZvOiBRLlByb21pc2U8TW9kZWw+O1xuICAvLyB0aW1lc3RhbXAgb2YgbGFzdCBTeW5jU3RvcmUuZmV0Y2hTZXJ2ZXJJbmZvLCAwIHdoaWxlIHJlcXVlc3QgaXMgb3V0c3RhbmRpbmdcbiAgcHVibGljIHRpbWVzdGFtcEZldGNoaW5nU2VydmVySW5mbzogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IHtcbiAgICBlbnRpdHk6IHN0cmluZyxcbiAgICBtb2RlbFR5cGU6IE1vZGVsQ3RvcixcbiAgICB1cmxSb290OiBzdHJpbmcsXG4gICAgc29ja2V0UGF0aDogc3RyaW5nLFxuICAgIHVzZXJVdWlkOiBzdHJpbmdcbiAgfSkge1xuICAgIHRoaXMuZW50aXR5ID0gb3B0aW9ucy5lbnRpdHk7XG4gICAgdGhpcy5tb2RlbFR5cGUgPSBvcHRpb25zLm1vZGVsVHlwZTtcbiAgICB0aGlzLnVybFJvb3QgPSBvcHRpb25zLnVybFJvb3Q7XG4gICAgdGhpcy5zb2NrZXRQYXRoID0gb3B0aW9ucy5zb2NrZXRQYXRoO1xuICAgIHRoaXMudXNlclV1aWQgPSBvcHRpb25zLnVzZXJVdWlkO1xuXG4gICAgdmFyIGhyZWYgPSB1cmwucGFyc2Uob3B0aW9ucy51cmxSb290KTtcbiAgICB0aGlzLmhvc3QgPSBocmVmLnByb3RvY29sICsgJy8vJyArIGhyZWYuaG9zdG5hbWU7XG4gICAgaWYgKCFocmVmLnBvcnQpIHtcbiAgICAgIC8vIHNvY2tldC5pbyBuZWVkcyBwb3J0IGV2ZW50IGZvciBzdGFuZGFyZCBwcm90b2NvbHNcbiAgICAgIGlmIChocmVmLnByb3RvY29sID09PSAnaHR0cHM6Jykge1xuICAgICAgICB0aGlzLmhvc3QgKz0gJzo0NDMnO1xuICAgICAgfSBlbHNlIGlmIChocmVmLnByb3RvY29sID09PSAnaHR0cDonKSB7XG4gICAgICAgIHRoaXMuaG9zdCArPSAnOjgwJztcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5wYXRoID0gaHJlZi5wYXRobmFtZTtcblxuICAgIHZhciB1c2VyID0gb3B0aW9ucy51c2VyVXVpZCA/IG9wdGlvbnMudXNlclV1aWQgKyAnLycgOiAnJztcbiAgICB2YXIgbmFtZSA9IG9wdGlvbnMuZW50aXR5O1xuICAgIHZhciBoYXNoID0gaGFzaENvZGUodGhpcy5ob3N0KTtcbiAgICB0aGlzLmNoYW5uZWwgPSB1c2VyICsgbmFtZSArICcvJyArIGhhc2g7XG4gIH1cblxuICAvKipcbiAgICogY2xvc2UgdGhlIGVuZHBvaW50IGV4cGxpY2l0LlxuICAgKi9cbiAgcHVibGljIGNsb3NlKCkge1xuICAgIGlmICh0aGlzLnNvY2tldCkge1xuICAgICAgLy8gY29uc2lkZXIgY2FsbGluZyB0aGlzLnNvY2tldC5jbG9zZSgpIGluc3RlYWRcbiAgICAgICg8YW55PnRoaXMuc29ja2V0KS5zb2NrZXQuY2xvc2UoKTtcbiAgICAgIHRoaXMuc29ja2V0ID0gbnVsbDtcbiAgICB9XG4gICAgaWYgKHRoaXMubG9jYWxTdG9yZSkge1xuICAgICAgdGhpcy5sb2NhbFN0b3JlLmNsb3NlKCk7XG4gICAgICB0aGlzLmxvY2FsU3RvcmUgPSBudWxsO1xuICAgIH1cbiAgfVxufVxuIl19