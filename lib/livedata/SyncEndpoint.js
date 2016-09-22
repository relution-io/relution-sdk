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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY0VuZHBvaW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL1N5bmNFbmRwb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksR0FBRyxXQUFNLEtBQUssQ0FBQyxDQUFBO0FBTTNCOzs7O0dBSUc7QUFDSDtJQUF5QixjQUFpQjtTQUFqQixXQUFpQixDQUFqQixzQkFBaUIsQ0FBakIsSUFBaUI7UUFBakIsNkJBQWlCOztJQUN4QyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7SUFDYixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUNyQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3hCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDM0MsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDbkMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLDJCQUEyQjtRQUN4QyxDQUFDO0lBQ0gsQ0FBQztJQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBWGUsZ0JBQVEsV0FXdkIsQ0FBQTtBQUVEOztHQUVHO0FBQ0g7SUE0QkUsc0JBQVksT0FNWDtRQXZCTSxnQkFBVyxHQUFvQixJQUFJLENBQUM7UUF3QnpDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM3QixJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFDbkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1FBQy9CLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztRQUNyQyxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFFakMsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQ2pELEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDZixvREFBb0Q7WUFDcEQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixJQUFJLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQztZQUN0QixDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDckMsSUFBSSxDQUFDLElBQUksSUFBSSxLQUFLLENBQUM7WUFDckIsQ0FBQztRQUNILENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFFMUIsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDMUQsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUMxQixJQUFJLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO0lBQzFDLENBQUM7SUFFRDs7T0FFRztJQUNJLDRCQUFLLEdBQVo7UUFDRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNoQiwrQ0FBK0M7WUFDekMsSUFBSSxDQUFDLE1BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDckIsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDekIsQ0FBQztJQUNILENBQUM7SUFDSCxtQkFBQztBQUFELENBQUMsQUF6RUQsSUF5RUM7QUF6RVksb0JBQVksZUF5RXhCLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gKiBAZmlsZSBsaXZlZGF0YS9TeW5jRW5kcG9pbnQudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDA3LjEyLjIwMTVcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIGxpdmVkYXRhXHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbmltcG9ydCAqIGFzIHVybCBmcm9tICd1cmwnO1xyXG5cclxuaW1wb3J0IHtTdG9yZX0gZnJvbSAnLi9TdG9yZSc7XHJcbmltcG9ydCB7TW9kZWwsIE1vZGVsQ3Rvcn0gZnJvbSAnLi9Nb2RlbCc7XHJcbmltcG9ydCB7Q29sbGVjdGlvbn0gZnJvbSAnLi9Db2xsZWN0aW9uJztcclxuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcclxuLyoqXHJcbiAqIHZlcnkgc2ltcGxlIGhhc2ggY29kaW5nIGltcGxlbWVudGF0aW9uLlxyXG4gKlxyXG4gKiBAaW50ZXJuYWwgRm9yIGxpYnJhcnkgdXNlIG9ubHkuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaGFzaENvZGUoLi4uYXJnczogc3RyaW5nW10pIHtcclxuICB2YXIgaGFzaCA9IDA7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgKytpKSB7XHJcbiAgICB2YXIgc3RyID0gYXJnc1tpXSB8fCAnJztcclxuICAgIGZvciAodmFyIGogPSAwLCBsID0gc3RyLmxlbmd0aDsgaiA8IGw7ICsraikge1xyXG4gICAgICB2YXIgY2hhciA9IHN0ci5jaGFyQ29kZUF0KGopO1xyXG4gICAgICBoYXNoID0gKChoYXNoIDw8IDUpIC0gaGFzaCkgKyBjaGFyO1xyXG4gICAgICBoYXNoIHw9IDA7IC8vIENvbnZlcnQgdG8gMzJiaXQgaW50ZWdlclxyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gaGFzaDtcclxufVxyXG5cclxuLyoqXHJcbiAqIG1hbmFnZXMgY29ubmVjdGlvbiBvZiBTeW5jU3RvcmUgdG8gb25lIGVudGl0eS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBTeW5jRW5kcG9pbnQge1xyXG5cclxuICBwdWJsaWMgZW50aXR5OiBzdHJpbmc7XHJcbiAgcHVibGljIG1vZGVsVHlwZTogTW9kZWxDdG9yO1xyXG4gIHB1YmxpYyB1cmxSb290OiBzdHJpbmc7XHJcbiAgcHVibGljIHNvY2tldFBhdGg6IHN0cmluZztcclxuICBwdWJsaWMgdXNlclV1aWQ6IHN0cmluZztcclxuXHJcbiAgcHVibGljIGhvc3Q6IHN0cmluZztcclxuICBwdWJsaWMgcGF0aDogc3RyaW5nO1xyXG4gIHB1YmxpYyBjaGFubmVsOiBzdHJpbmc7XHJcbiAgcHVibGljIGlzQ29ubmVjdGVkOiBRLlByb21pc2U8dm9pZD4gPSBudWxsO1xyXG5cclxuICBwdWJsaWMgbG9jYWxTdG9yZTogU3RvcmU7XHJcbiAgcHVibGljIGluZm86IFEuUHJvbWlzZTxNb2RlbD47XHJcbiAgcHVibGljIHByaW9yaXR5OiBudW1iZXI7XHJcbiAgcHVibGljIHNvY2tldDogU29ja2V0SU9DbGllbnQuU29ja2V0O1xyXG5cclxuICAvLyBwcm9taXNlIG9mIGxhc3QgU3luY1N0b3JlLmZldGNoQ2hhbmdlc1xyXG4gIHB1YmxpYyBwcm9taXNlRmV0Y2hpbmdDaGFuZ2VzOiBRLlByb21pc2U8Q29sbGVjdGlvbj47XHJcbiAgLy8gdGltZXN0YW1wIG9mIGxhc3QgU3luY1N0b3JlLmZldGNoQ2hhbmdlcywgMCB3aGlsZSByZXF1ZXN0IGlzIG91dHN0YW5kaW5nXHJcbiAgcHVibGljIHRpbWVzdGFtcEZldGNoaW5nQ2hhbmdlczogbnVtYmVyO1xyXG5cclxuICAvLyBwcm9taXNlIG9mIGxhc3QgU3luY1N0b3JlLmZldGNoU2VydmVySW5mb1xyXG4gIHB1YmxpYyBwcm9taXNlRmV0Y2hpbmdTZXJ2ZXJJbmZvOiBRLlByb21pc2U8TW9kZWw+O1xyXG4gIC8vIHRpbWVzdGFtcCBvZiBsYXN0IFN5bmNTdG9yZS5mZXRjaFNlcnZlckluZm8sIDAgd2hpbGUgcmVxdWVzdCBpcyBvdXRzdGFuZGluZ1xyXG4gIHB1YmxpYyB0aW1lc3RhbXBGZXRjaGluZ1NlcnZlckluZm86IG51bWJlcjtcclxuXHJcbiAgY29uc3RydWN0b3Iob3B0aW9uczoge1xyXG4gICAgZW50aXR5OiBzdHJpbmcsXHJcbiAgICBtb2RlbFR5cGU6IE1vZGVsQ3RvcixcclxuICAgIHVybFJvb3Q6IHN0cmluZyxcclxuICAgIHNvY2tldFBhdGg6IHN0cmluZyxcclxuICAgIHVzZXJVdWlkOiBzdHJpbmdcclxuICB9KSB7XHJcbiAgICB0aGlzLmVudGl0eSA9IG9wdGlvbnMuZW50aXR5O1xyXG4gICAgdGhpcy5tb2RlbFR5cGUgPSBvcHRpb25zLm1vZGVsVHlwZTtcclxuICAgIHRoaXMudXJsUm9vdCA9IG9wdGlvbnMudXJsUm9vdDtcclxuICAgIHRoaXMuc29ja2V0UGF0aCA9IG9wdGlvbnMuc29ja2V0UGF0aDtcclxuICAgIHRoaXMudXNlclV1aWQgPSBvcHRpb25zLnVzZXJVdWlkO1xyXG5cclxuICAgIHZhciBocmVmID0gdXJsLnBhcnNlKG9wdGlvbnMudXJsUm9vdCk7XHJcbiAgICB0aGlzLmhvc3QgPSBocmVmLnByb3RvY29sICsgJy8vJyArIGhyZWYuaG9zdG5hbWU7XHJcbiAgICBpZiAoIWhyZWYucG9ydCkge1xyXG4gICAgICAvLyBzb2NrZXQuaW8gbmVlZHMgcG9ydCBldmVudCBmb3Igc3RhbmRhcmQgcHJvdG9jb2xzXHJcbiAgICAgIGlmIChocmVmLnByb3RvY29sID09PSAnaHR0cHM6Jykge1xyXG4gICAgICAgIHRoaXMuaG9zdCArPSAnOjQ0Myc7XHJcbiAgICAgIH0gZWxzZSBpZiAoaHJlZi5wcm90b2NvbCA9PT0gJ2h0dHA6Jykge1xyXG4gICAgICAgIHRoaXMuaG9zdCArPSAnOjgwJztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy5wYXRoID0gaHJlZi5wYXRobmFtZTtcclxuXHJcbiAgICB2YXIgdXNlciA9IG9wdGlvbnMudXNlclV1aWQgPyBvcHRpb25zLnVzZXJVdWlkICsgJy8nIDogJyc7XHJcbiAgICB2YXIgbmFtZSA9IG9wdGlvbnMuZW50aXR5O1xyXG4gICAgdmFyIGhhc2ggPSBoYXNoQ29kZSh0aGlzLmhvc3QpO1xyXG4gICAgdGhpcy5jaGFubmVsID0gdXNlciArIG5hbWUgKyAnLycgKyBoYXNoO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogY2xvc2UgdGhlIGVuZHBvaW50IGV4cGxpY2l0LlxyXG4gICAqL1xyXG4gIHB1YmxpYyBjbG9zZSgpIHtcclxuICAgIGlmICh0aGlzLnNvY2tldCkge1xyXG4gICAgICAvLyBjb25zaWRlciBjYWxsaW5nIHRoaXMuc29ja2V0LmNsb3NlKCkgaW5zdGVhZFxyXG4gICAgICAoPGFueT50aGlzLnNvY2tldCkuc29ja2V0LmNsb3NlKCk7XHJcbiAgICAgIHRoaXMuc29ja2V0ID0gbnVsbDtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmxvY2FsU3RvcmUpIHtcclxuICAgICAgdGhpcy5sb2NhbFN0b3JlLmNsb3NlKCk7XHJcbiAgICAgIHRoaXMubG9jYWxTdG9yZSA9IG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiJdfQ==