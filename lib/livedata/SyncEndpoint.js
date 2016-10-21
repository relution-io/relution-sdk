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
        // notice socket.io needs port even for standard protocols
        var href = url.parse(options.urlRoot);
        this.host = href.protocol + '//' + href.hostname;
        if (href.port) {
            this.host += ':' + href.port;
        }
        else if (href.protocol === 'https:') {
            this.host += ':443';
        }
        else if (href.protocol === 'http:') {
            this.host += ':80';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY0VuZHBvaW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL1N5bmNFbmRwb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksR0FBRyxXQUFNLEtBQUssQ0FBQyxDQUFBO0FBTTNCOzs7O0dBSUc7QUFDSDtJQUF5QixjQUFpQjtTQUFqQixXQUFpQixDQUFqQixzQkFBaUIsQ0FBakIsSUFBaUI7UUFBakIsNkJBQWlCOztJQUN4QyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7SUFDYixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUNyQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3hCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDM0MsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDbkMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLDJCQUEyQjtRQUN4QyxDQUFDO0lBQ0gsQ0FBQztJQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBWGUsZ0JBQVEsV0FXdkIsQ0FBQTtBQUVEOztHQUVHO0FBQ0g7SUE0QkUsc0JBQVksT0FNWDtRQXZCTSxnQkFBVyxHQUFvQixJQUFJLENBQUM7UUF3QnpDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM3QixJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDbkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1FBQy9CLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztRQUNyQyxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDakMsMERBQTBEO1FBQzFELElBQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUNqRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNkLElBQUksQ0FBQyxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDL0IsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdEMsSUFBSSxDQUFDLElBQUksSUFBSSxNQUFNLENBQUM7UUFDdEIsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLElBQUksSUFBSSxLQUFLLENBQUM7UUFDckIsQ0FBQztRQUNELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUUxQixJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUM1RCxJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQzVCLElBQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUM7SUFDMUMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksNEJBQUssR0FBWjtRQUNFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLCtDQUErQztZQUN6QyxJQUFJLENBQUMsTUFBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUNyQixDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDcEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUN6QixDQUFDO0lBQ0gsQ0FBQztJQUNILG1CQUFDO0FBQUQsQ0FBQyxBQXhFRCxJQXdFQztBQXhFWSxvQkFBWSxlQXdFeEIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBsaXZlZGF0YS9TeW5jRW5kcG9pbnQudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDA3LjEyLjIwMTVcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXZlZGF0YVxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XG5cbmltcG9ydCB7IFN0b3JlIH0gZnJvbSAnLi9TdG9yZSc7XG5pbXBvcnQgeyBNb2RlbCwgTW9kZWxDdG9yIH0gZnJvbSAnLi9Nb2RlbCc7XG5pbXBvcnQgeyBDb2xsZWN0aW9uIH0gZnJvbSAnLi9Db2xsZWN0aW9uJztcbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XG4vKipcbiAqIHZlcnkgc2ltcGxlIGhhc2ggY29kaW5nIGltcGxlbWVudGF0aW9uLlxuICpcbiAqIEBpbnRlcm5hbCBGb3IgbGlicmFyeSB1c2Ugb25seS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc2hDb2RlKC4uLmFyZ3M6IHN0cmluZ1tdKSB7XG4gIHZhciBoYXNoID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHN0ciA9IGFyZ3NbaV0gfHwgJyc7XG4gICAgZm9yICh2YXIgaiA9IDAsIGwgPSBzdHIubGVuZ3RoOyBqIDwgbDsgKytqKSB7XG4gICAgICB2YXIgY2hhciA9IHN0ci5jaGFyQ29kZUF0KGopO1xuICAgICAgaGFzaCA9ICgoaGFzaCA8PCA1KSAtIGhhc2gpICsgY2hhcjtcbiAgICAgIGhhc2ggfD0gMDsgLy8gQ29udmVydCB0byAzMmJpdCBpbnRlZ2VyXG4gICAgfVxuICB9XG4gIHJldHVybiBoYXNoO1xufVxuXG4vKipcbiAqIG1hbmFnZXMgY29ubmVjdGlvbiBvZiBTeW5jU3RvcmUgdG8gb25lIGVudGl0eS5cbiAqL1xuZXhwb3J0IGNsYXNzIFN5bmNFbmRwb2ludCB7XG5cbiAgcHVibGljIGVudGl0eTogc3RyaW5nO1xuICBwdWJsaWMgbW9kZWxUeXBlOiBNb2RlbEN0b3I7XG4gIHB1YmxpYyB1cmxSb290OiBzdHJpbmc7XG4gIHB1YmxpYyBzb2NrZXRQYXRoOiBzdHJpbmc7XG4gIHB1YmxpYyB1c2VyVXVpZDogc3RyaW5nO1xuXG4gIHB1YmxpYyBob3N0OiBzdHJpbmc7XG4gIHB1YmxpYyBwYXRoOiBzdHJpbmc7XG4gIHB1YmxpYyBjaGFubmVsOiBzdHJpbmc7XG4gIHB1YmxpYyBpc0Nvbm5lY3RlZDogUS5Qcm9taXNlPHZvaWQ+ID0gbnVsbDtcblxuICBwdWJsaWMgbG9jYWxTdG9yZTogU3RvcmU7XG4gIHB1YmxpYyBpbmZvOiBRLlByb21pc2U8TW9kZWw+O1xuICBwdWJsaWMgcHJpb3JpdHk6IG51bWJlcjtcbiAgcHVibGljIHNvY2tldDogU29ja2V0SU9DbGllbnQuU29ja2V0O1xuXG4gIC8vIHByb21pc2Ugb2YgbGFzdCBTeW5jU3RvcmUuZmV0Y2hDaGFuZ2VzXG4gIHB1YmxpYyBwcm9taXNlRmV0Y2hpbmdDaGFuZ2VzOiBRLlByb21pc2U8Q29sbGVjdGlvbj47XG4gIC8vIHRpbWVzdGFtcCBvZiBsYXN0IFN5bmNTdG9yZS5mZXRjaENoYW5nZXMsIDAgd2hpbGUgcmVxdWVzdCBpcyBvdXRzdGFuZGluZ1xuICBwdWJsaWMgdGltZXN0YW1wRmV0Y2hpbmdDaGFuZ2VzOiBudW1iZXI7XG5cbiAgLy8gcHJvbWlzZSBvZiBsYXN0IFN5bmNTdG9yZS5mZXRjaFNlcnZlckluZm9cbiAgcHVibGljIHByb21pc2VGZXRjaGluZ1NlcnZlckluZm86IFEuUHJvbWlzZTxNb2RlbD47XG4gIC8vIHRpbWVzdGFtcCBvZiBsYXN0IFN5bmNTdG9yZS5mZXRjaFNlcnZlckluZm8sIDAgd2hpbGUgcmVxdWVzdCBpcyBvdXRzdGFuZGluZ1xuICBwdWJsaWMgdGltZXN0YW1wRmV0Y2hpbmdTZXJ2ZXJJbmZvOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3Iob3B0aW9uczoge1xuICAgIGVudGl0eTogc3RyaW5nLFxuICAgIG1vZGVsVHlwZTogTW9kZWxDdG9yLFxuICAgIHVybFJvb3Q6IHN0cmluZyxcbiAgICBzb2NrZXRQYXRoOiBzdHJpbmcsXG4gICAgdXNlclV1aWQ6IHN0cmluZ1xuICB9KSB7XG4gICAgdGhpcy5lbnRpdHkgPSBvcHRpb25zLmVudGl0eTtcbiAgICB0aGlzLm1vZGVsVHlwZSA9IG9wdGlvbnMubW9kZWxUeXBlO1xuICAgIHRoaXMudXJsUm9vdCA9IG9wdGlvbnMudXJsUm9vdDtcbiAgICB0aGlzLnNvY2tldFBhdGggPSBvcHRpb25zLnNvY2tldFBhdGg7XG4gICAgdGhpcy51c2VyVXVpZCA9IG9wdGlvbnMudXNlclV1aWQ7XG4gICAgLy8gbm90aWNlIHNvY2tldC5pbyBuZWVkcyBwb3J0IGV2ZW4gZm9yIHN0YW5kYXJkIHByb3RvY29sc1xuICAgIGNvbnN0IGhyZWYgPSB1cmwucGFyc2Uob3B0aW9ucy51cmxSb290KTtcbiAgICB0aGlzLmhvc3QgPSBocmVmLnByb3RvY29sICsgJy8vJyArIGhyZWYuaG9zdG5hbWU7XG4gICAgaWYgKGhyZWYucG9ydCkge1xuICAgICAgdGhpcy5ob3N0ICs9ICc6JyArIGhyZWYucG9ydDtcbiAgICB9IGVsc2UgaWYgKGhyZWYucHJvdG9jb2wgPT09ICdodHRwczonKSB7XG4gICAgICB0aGlzLmhvc3QgKz0gJzo0NDMnO1xuICAgIH0gZWxzZSBpZiAoaHJlZi5wcm90b2NvbCA9PT0gJ2h0dHA6Jykge1xuICAgICAgdGhpcy5ob3N0ICs9ICc6ODAnO1xuICAgIH1cbiAgICB0aGlzLnBhdGggPSBocmVmLnBhdGhuYW1lO1xuXG4gICAgY29uc3QgdXNlciA9IG9wdGlvbnMudXNlclV1aWQgPyBvcHRpb25zLnVzZXJVdWlkICsgJy8nIDogJyc7XG4gICAgY29uc3QgbmFtZSA9IG9wdGlvbnMuZW50aXR5O1xuICAgIGNvbnN0IGhhc2ggPSBoYXNoQ29kZSh0aGlzLmhvc3QpO1xuICAgIHRoaXMuY2hhbm5lbCA9IHVzZXIgKyBuYW1lICsgJy8nICsgaGFzaDtcbiAgfVxuXG4gIC8qKlxuICAgKiBjbG9zZSB0aGUgZW5kcG9pbnQgZXhwbGljaXQuXG4gICAqL1xuICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgaWYgKHRoaXMuc29ja2V0KSB7XG4gICAgICAvLyBjb25zaWRlciBjYWxsaW5nIHRoaXMuc29ja2V0LmNsb3NlKCkgaW5zdGVhZFxuICAgICAgKDxhbnk+dGhpcy5zb2NrZXQpLnNvY2tldC5jbG9zZSgpO1xuICAgICAgdGhpcy5zb2NrZXQgPSBudWxsO1xuICAgIH1cbiAgICBpZiAodGhpcy5sb2NhbFN0b3JlKSB7XG4gICAgICB0aGlzLmxvY2FsU3RvcmUuY2xvc2UoKTtcbiAgICAgIHRoaXMubG9jYWxTdG9yZSA9IG51bGw7XG4gICAgfVxuICB9XG59XG4iXX0=