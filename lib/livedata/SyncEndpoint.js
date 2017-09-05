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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY0VuZHBvaW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL1N5bmNFbmRwb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksR0FBRyxXQUFNLEtBQUssQ0FBQyxDQUFBO0FBTTNCOzs7O0dBSUc7QUFDSDtJQUF5QixjQUFpQjtTQUFqQixXQUFpQixDQUFqQixzQkFBaUIsQ0FBakIsSUFBaUI7UUFBakIsNkJBQWlCOztJQUN4QyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7SUFDYixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUNyQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3hCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDM0MsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDbkMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLDJCQUEyQjtRQUN4QyxDQUFDO0lBQ0gsQ0FBQztJQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBWGUsZ0JBQVEsV0FXdkIsQ0FBQTtBQUVEOztHQUVHO0FBQ0g7SUE0QkUsc0JBQVksT0FNWDtRQXZCTSxnQkFBVyxHQUFvQixJQUFJLENBQUM7UUF3QnpDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM3QixJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDbkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1FBQy9CLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztRQUNyQyxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDakMsMERBQTBEO1FBQzFELElBQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUNqRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNkLElBQUksQ0FBQyxJQUFJLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDL0IsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdEMsSUFBSSxDQUFDLElBQUksSUFBSSxNQUFNLENBQUM7UUFDdEIsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLElBQUksSUFBSSxLQUFLLENBQUM7UUFDckIsQ0FBQztRQUNELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUUxQixJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUM1RCxJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQzVCLElBQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUM7SUFDMUMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksNEJBQUssR0FBWjtRQUNFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLCtDQUErQztZQUN6QyxJQUFJLENBQUMsTUFBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUNyQixDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDcEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUN6QixDQUFDO0lBQ0gsQ0FBQztJQUNILG1CQUFDO0FBQUQsQ0FBQyxBQXhFRCxJQXdFQztBQXhFWSxvQkFBWSxlQXdFeEIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXHJcbiAqIEBmaWxlIGxpdmVkYXRhL1N5bmNFbmRwb2ludC50c1xyXG4gKiBSZWx1dGlvbiBTREtcclxuICpcclxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMDcuMTIuMjAxNVxyXG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcclxuICovXHJcbi8qKiAqL1xyXG5cclxuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XHJcblxyXG5pbXBvcnQgeyBTdG9yZSB9IGZyb20gJy4vU3RvcmUnO1xyXG5pbXBvcnQgeyBNb2RlbCwgTW9kZWxDdG9yIH0gZnJvbSAnLi9Nb2RlbCc7XHJcbmltcG9ydCB7IENvbGxlY3Rpb24gfSBmcm9tICcuL0NvbGxlY3Rpb24nO1xyXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xyXG4vKipcclxuICogdmVyeSBzaW1wbGUgaGFzaCBjb2RpbmcgaW1wbGVtZW50YXRpb24uXHJcbiAqXHJcbiAqIEBpbnRlcm5hbCBGb3IgbGlicmFyeSB1c2Ugb25seS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBoYXNoQ29kZSguLi5hcmdzOiBzdHJpbmdbXSkge1xyXG4gIHZhciBoYXNoID0gMDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyArK2kpIHtcclxuICAgIHZhciBzdHIgPSBhcmdzW2ldIHx8ICcnO1xyXG4gICAgZm9yICh2YXIgaiA9IDAsIGwgPSBzdHIubGVuZ3RoOyBqIDwgbDsgKytqKSB7XHJcbiAgICAgIHZhciBjaGFyID0gc3RyLmNoYXJDb2RlQXQoaik7XHJcbiAgICAgIGhhc2ggPSAoKGhhc2ggPDwgNSkgLSBoYXNoKSArIGNoYXI7XHJcbiAgICAgIGhhc2ggfD0gMDsgLy8gQ29udmVydCB0byAzMmJpdCBpbnRlZ2VyXHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBoYXNoO1xyXG59XHJcblxyXG4vKipcclxuICogbWFuYWdlcyBjb25uZWN0aW9uIG9mIFN5bmNTdG9yZSB0byBvbmUgZW50aXR5LlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFN5bmNFbmRwb2ludCB7XHJcblxyXG4gIHB1YmxpYyBlbnRpdHk6IHN0cmluZztcclxuICBwdWJsaWMgbW9kZWxUeXBlOiBNb2RlbEN0b3I7XHJcbiAgcHVibGljIHVybFJvb3Q6IHN0cmluZztcclxuICBwdWJsaWMgc29ja2V0UGF0aDogc3RyaW5nO1xyXG4gIHB1YmxpYyB1c2VyVXVpZDogc3RyaW5nO1xyXG5cclxuICBwdWJsaWMgaG9zdDogc3RyaW5nO1xyXG4gIHB1YmxpYyBwYXRoOiBzdHJpbmc7XHJcbiAgcHVibGljIGNoYW5uZWw6IHN0cmluZztcclxuICBwdWJsaWMgaXNDb25uZWN0ZWQ6IFEuUHJvbWlzZTx2b2lkPiA9IG51bGw7XHJcblxyXG4gIHB1YmxpYyBsb2NhbFN0b3JlOiBTdG9yZTtcclxuICBwdWJsaWMgaW5mbzogUS5Qcm9taXNlPE1vZGVsPjtcclxuICBwdWJsaWMgcHJpb3JpdHk6IG51bWJlcjtcclxuICBwdWJsaWMgc29ja2V0OiBTb2NrZXRJT0NsaWVudC5Tb2NrZXQ7XHJcblxyXG4gIC8vIHByb21pc2Ugb2YgbGFzdCBTeW5jU3RvcmUuZmV0Y2hDaGFuZ2VzXHJcbiAgcHVibGljIHByb21pc2VGZXRjaGluZ0NoYW5nZXM6IFEuUHJvbWlzZTxDb2xsZWN0aW9uPjtcclxuICAvLyB0aW1lc3RhbXAgb2YgbGFzdCBTeW5jU3RvcmUuZmV0Y2hDaGFuZ2VzLCAwIHdoaWxlIHJlcXVlc3QgaXMgb3V0c3RhbmRpbmdcclxuICBwdWJsaWMgdGltZXN0YW1wRmV0Y2hpbmdDaGFuZ2VzOiBudW1iZXI7XHJcblxyXG4gIC8vIHByb21pc2Ugb2YgbGFzdCBTeW5jU3RvcmUuZmV0Y2hTZXJ2ZXJJbmZvXHJcbiAgcHVibGljIHByb21pc2VGZXRjaGluZ1NlcnZlckluZm86IFEuUHJvbWlzZTxNb2RlbD47XHJcbiAgLy8gdGltZXN0YW1wIG9mIGxhc3QgU3luY1N0b3JlLmZldGNoU2VydmVySW5mbywgMCB3aGlsZSByZXF1ZXN0IGlzIG91dHN0YW5kaW5nXHJcbiAgcHVibGljIHRpbWVzdGFtcEZldGNoaW5nU2VydmVySW5mbzogbnVtYmVyO1xyXG5cclxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiB7XHJcbiAgICBlbnRpdHk6IHN0cmluZyxcclxuICAgIG1vZGVsVHlwZTogTW9kZWxDdG9yLFxyXG4gICAgdXJsUm9vdDogc3RyaW5nLFxyXG4gICAgc29ja2V0UGF0aDogc3RyaW5nLFxyXG4gICAgdXNlclV1aWQ6IHN0cmluZ1xyXG4gIH0pIHtcclxuICAgIHRoaXMuZW50aXR5ID0gb3B0aW9ucy5lbnRpdHk7XHJcbiAgICB0aGlzLm1vZGVsVHlwZSA9IG9wdGlvbnMubW9kZWxUeXBlO1xyXG4gICAgdGhpcy51cmxSb290ID0gb3B0aW9ucy51cmxSb290O1xyXG4gICAgdGhpcy5zb2NrZXRQYXRoID0gb3B0aW9ucy5zb2NrZXRQYXRoO1xyXG4gICAgdGhpcy51c2VyVXVpZCA9IG9wdGlvbnMudXNlclV1aWQ7XHJcbiAgICAvLyBub3RpY2Ugc29ja2V0LmlvIG5lZWRzIHBvcnQgZXZlbiBmb3Igc3RhbmRhcmQgcHJvdG9jb2xzXHJcbiAgICBjb25zdCBocmVmID0gdXJsLnBhcnNlKG9wdGlvbnMudXJsUm9vdCk7XHJcbiAgICB0aGlzLmhvc3QgPSBocmVmLnByb3RvY29sICsgJy8vJyArIGhyZWYuaG9zdG5hbWU7XHJcbiAgICBpZiAoaHJlZi5wb3J0KSB7XHJcbiAgICAgIHRoaXMuaG9zdCArPSAnOicgKyBocmVmLnBvcnQ7XHJcbiAgICB9IGVsc2UgaWYgKGhyZWYucHJvdG9jb2wgPT09ICdodHRwczonKSB7XHJcbiAgICAgIHRoaXMuaG9zdCArPSAnOjQ0Myc7XHJcbiAgICB9IGVsc2UgaWYgKGhyZWYucHJvdG9jb2wgPT09ICdodHRwOicpIHtcclxuICAgICAgdGhpcy5ob3N0ICs9ICc6ODAnO1xyXG4gICAgfVxyXG4gICAgdGhpcy5wYXRoID0gaHJlZi5wYXRobmFtZTtcclxuXHJcbiAgICBjb25zdCB1c2VyID0gb3B0aW9ucy51c2VyVXVpZCA/IG9wdGlvbnMudXNlclV1aWQgKyAnLycgOiAnJztcclxuICAgIGNvbnN0IG5hbWUgPSBvcHRpb25zLmVudGl0eTtcclxuICAgIGNvbnN0IGhhc2ggPSBoYXNoQ29kZSh0aGlzLmhvc3QpO1xyXG4gICAgdGhpcy5jaGFubmVsID0gdXNlciArIG5hbWUgKyAnLycgKyBoYXNoO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogY2xvc2UgdGhlIGVuZHBvaW50IGV4cGxpY2l0LlxyXG4gICAqL1xyXG4gIHB1YmxpYyBjbG9zZSgpIHtcclxuICAgIGlmICh0aGlzLnNvY2tldCkge1xyXG4gICAgICAvLyBjb25zaWRlciBjYWxsaW5nIHRoaXMuc29ja2V0LmNsb3NlKCkgaW5zdGVhZFxyXG4gICAgICAoPGFueT50aGlzLnNvY2tldCkuc29ja2V0LmNsb3NlKCk7XHJcbiAgICAgIHRoaXMuc29ja2V0ID0gbnVsbDtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmxvY2FsU3RvcmUpIHtcclxuICAgICAgdGhpcy5sb2NhbFN0b3JlLmNsb3NlKCk7XHJcbiAgICAgIHRoaXMubG9jYWxTdG9yZSA9IG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiJdfQ==