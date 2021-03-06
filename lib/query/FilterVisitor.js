/*
 * @file query/FilterVisitor.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 22.06.2015
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
 * @module query
 */
/** */
"use strict";
var FilterVisitorBase = (function () {
    function FilterVisitorBase() {
    }
    FilterVisitorBase.prototype.visit = function (filter) {
        return this[filter.type].apply(this, arguments);
    };
    FilterVisitorBase.prototype.logOp = function (filter) {
        return this[filter.operation.toLowerCase() + 'Op'].apply(this, arguments);
    };
    return FilterVisitorBase;
}());
exports.FilterVisitorBase = FilterVisitorBase;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsdGVyVmlzaXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9xdWVyeS9GaWx0ZXJWaXNpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBeUJOO0lBQUE7SUFRQSxDQUFDO0lBUFEsaUNBQUssR0FBWixVQUFhLE1BQXNCO1FBQ2pDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVELGlDQUFLLEdBQUwsVUFBTSxNQUEyQjtRQUMvQixNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBQ0gsd0JBQUM7QUFBRCxDQUFDLEFBUkQsSUFRQztBQVJZLHlCQUFpQixvQkFRN0IsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBxdWVyeS9GaWx0ZXJWaXNpdG9yLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyMi4wNi4yMDE1XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgcXVlcnlcbiAqL1xuLyoqICovXG5cbmltcG9ydCAqIGFzIGZpbHRlcnMgZnJvbSAnLi9GaWx0ZXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIEZpbHRlclZpc2l0b3JDb3JlPFQ+IHtcbiAgYW5kT3AoZmlsdGVyOiBmaWx0ZXJzLkxvZ09wRmlsdGVyKTogVDtcbiAgb3JPcChmaWx0ZXI6ICBmaWx0ZXJzLkxvZ09wRmlsdGVyKTogVDtcbiAgbmFuZE9wKGZpbHRlcjogZmlsdGVycy5Mb2dPcEZpbHRlcik6IFQ7XG4gIG5vck9wKGZpbHRlcjogZmlsdGVycy5Mb2dPcEZpbHRlcik6IFQ7XG5cbiAgYm9vbGVhbihmaWx0ZXI6IGZpbHRlcnMuQm9vbGVhbkZpbHRlcik6IFQ7XG4gIGNvbnRhaW5zU3RyaW5nKGZpbHRlcjogZmlsdGVycy5Db250YWluc1N0cmluZ0ZpbHRlcik6IFQ7XG4gIGRhdGVSYW5nZShmaWx0ZXI6IGZpbHRlcnMuRGF0ZVJhbmdlRmlsdGVyKTogVDtcbiAgZG91YmxlUmFuZ2UoZmlsdGVyOiBmaWx0ZXJzLkRvdWJsZVJhbmdlRmlsdGVyKTogVDtcbiAgbGlrZShmaWx0ZXI6IGZpbHRlcnMuTGlrZUZpbHRlcik6IFQ7XG4gIGxvZ09wKGZpbHRlcjogZmlsdGVycy5Mb2dPcEZpbHRlcik6IFQ7XG4gIGxvbmdFbnVtKGZpbHRlcjogZmlsdGVycy5Mb25nRW51bUZpbHRlcik6IFQ7XG4gIGxvbmdSYW5nZShmaWx0ZXI6IGZpbHRlcnMuTG9uZ1JhbmdlRmlsdGVyKTogVDtcbiAgc3RyaW5nRW51bShmaWx0ZXI6IGZpbHRlcnMuU3RyaW5nRW51bUZpbHRlcik6IFQ7XG4gIHN0cmluZyhmaWx0ZXI6IGZpbHRlcnMuU3RyaW5nRmlsdGVyKTogVDtcbiAgc3RyaW5nTWFwKGZpbHRlcjogZmlsdGVycy5TdHJpbmdNYXBGaWx0ZXIpOiBUO1xuICBzdHJpbmdSYW5nZShmaWx0ZXI6IGZpbHRlcnMuU3RyaW5nUmFuZ2VGaWx0ZXIpOiBUO1xuICBudWxsKGZpbHRlcjogZmlsdGVycy5OdWxsRmlsdGVyKTogVDtcbn1cblxuZXhwb3J0IGNsYXNzIEZpbHRlclZpc2l0b3JCYXNlPFQ+IHtcbiAgcHVibGljIHZpc2l0KGZpbHRlcjogZmlsdGVycy5GaWx0ZXIpOiBUIHtcbiAgICByZXR1cm4gdGhpc1tmaWx0ZXIudHlwZV0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIGxvZ09wKGZpbHRlcjogZmlsdGVycy5Mb2dPcEZpbHRlcik6IFQge1xuICAgIHJldHVybiB0aGlzW2ZpbHRlci5vcGVyYXRpb24udG9Mb3dlckNhc2UoKSArICdPcCddLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cbn1cbiJdfQ==