/*
 * @file model/TypeScriptModelContainer.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 09.08.2016
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
 * @module model
 */
/** */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ModelContainer_1 = require('./ModelContainer');
var TypeScriptModelContainer = (function (_super) {
    __extends(TypeScriptModelContainer, _super);
    function TypeScriptModelContainer() {
        _super.apply(this, arguments);
    }
    return TypeScriptModelContainer;
}(ModelContainer_1.ModelContainer));
exports.TypeScriptModelContainer = TypeScriptModelContainer;
var TypeScriptMetaModel = (function (_super) {
    __extends(TypeScriptMetaModel, _super);
    function TypeScriptMetaModel() {
        _super.apply(this, arguments);
    }
    return TypeScriptMetaModel;
}(ModelContainer_1.MetaModel));
exports.TypeScriptMetaModel = TypeScriptMetaModel;
var TypeScriptFieldDefinition = (function (_super) {
    __extends(TypeScriptFieldDefinition, _super);
    function TypeScriptFieldDefinition() {
        _super.apply(this, arguments);
    }
    Object.defineProperty(TypeScriptFieldDefinition.prototype, "dataTypeTS", {
        get: function () {
            var type = this.dataTypeNormalized;
            return TypeScriptFieldDefinition.typeMapping[type] || type;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * @see https://www.typescriptlang.org/docs/handbook/basic-types.html
     */
    TypeScriptFieldDefinition.typeMapping = {
        'java.util.Map': '{ [key: string]: string; }',
        'java.lang.String': 'string',
        'java.lang.String[]': 'string[]',
        'java.lang.Character': 'string',
        'java.lang.Character[]': 'string[]',
        'java.lang.Byte': 'number',
        'java.lang.Byte[]': 'number[]',
        'java.lang.Short': 'number',
        'java.lang.Short[]': 'number[]',
        'java.lang.Integer': 'number',
        'java.lang.Integer[]': 'number[]',
        'java.lang.Long': 'number',
        'java.lang.Long[]': 'number[]',
        'java.math.BigInteger': 'number',
        'java.math.BigInteger[]': 'number[]',
        'java.math.BigDecimal': 'number',
        'java.math.BigDecimal[]': 'number[]',
        'java.lang.Double': 'number',
        'java.lang.Double[]': 'number[]',
        'java.lang.Float': 'number',
        'java.lang.Float[]': 'number[]',
        'java.lang.Boolean': 'boolean',
        'java.lang.Boolean[]': 'boolean[]',
        'com.mwaysolutions.gofer2.file.domain.File': 'any',
        'com.mwaysolutions.gofer2.file.domain.File[]': 'any[]',
        'java.util.Date': 'Date',
        'java.util.Date[]': 'Date[]',
        'java.lang.Object': 'any',
        'java.lang.Object[]': 'any',
        '[B': 'any' // Binary Data
    };
    return TypeScriptFieldDefinition;
}(ModelContainer_1.FieldDefinition));
exports.TypeScriptFieldDefinition = TypeScriptFieldDefinition;
var TypeScriptEnumDefinition = (function (_super) {
    __extends(TypeScriptEnumDefinition, _super);
    function TypeScriptEnumDefinition() {
        _super.apply(this, arguments);
    }
    return TypeScriptEnumDefinition;
}(ModelContainer_1.EnumDefinition));
exports.TypeScriptEnumDefinition = TypeScriptEnumDefinition;
var TypeScriptModelFactory = (function (_super) {
    __extends(TypeScriptModelFactory, _super);
    function TypeScriptModelFactory() {
        _super.apply(this, arguments);
    }
    TypeScriptModelFactory.instance = new TypeScriptModelFactory(TypeScriptModelContainer, TypeScriptMetaModel, TypeScriptFieldDefinition, TypeScriptEnumDefinition);
    return TypeScriptModelFactory;
}(ModelContainer_1.ModelFactory));
exports.TypeScriptModelFactory = TypeScriptModelFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHlwZVNjcmlwdE1vZGVsQ29udGFpbmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21vZGVsL1R5cGVTY3JpcHRNb2RlbENvbnRhaW5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOzs7Ozs7O0FBRU4sK0JBQXVGLGtCQUFrQixDQUFDLENBQUE7QUFFMUc7SUFBOEMsNENBQWM7SUFBNUQ7UUFBOEMsOEJBQWM7SUFFNUQsQ0FBQztJQUFELCtCQUFDO0FBQUQsQ0FBQyxBQUZELENBQThDLCtCQUFjLEdBRTNEO0FBRlksZ0NBQXdCLDJCQUVwQyxDQUFBO0FBRUQ7SUFBeUMsdUNBQVM7SUFBbEQ7UUFBeUMsOEJBQVM7SUFJbEQsQ0FBQztJQUFELDBCQUFDO0FBQUQsQ0FBQyxBQUpELENBQXlDLDBCQUFTLEdBSWpEO0FBSlksMkJBQW1CLHNCQUkvQixDQUFBO0FBRUQ7SUFBK0MsNkNBQWU7SUFBOUQ7UUFBK0MsOEJBQWU7SUE2QzlELENBQUM7SUFKQyxzQkFBSSxpREFBVTthQUFkO1lBQ0UsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDO1lBQ3JDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDO1FBQzdELENBQUM7OztPQUFBO0lBekNEOztPQUVHO0lBQ1cscUNBQVcsR0FBRztRQUMxQixlQUFlLEVBQUUsNEJBQTRCO1FBQzdDLGtCQUFrQixFQUFFLFFBQVE7UUFDNUIsb0JBQW9CLEVBQUUsVUFBVTtRQUNoQyxxQkFBcUIsRUFBRSxRQUFRO1FBQy9CLHVCQUF1QixFQUFFLFVBQVU7UUFDbkMsZ0JBQWdCLEVBQUUsUUFBUTtRQUMxQixrQkFBa0IsRUFBRSxVQUFVO1FBQzlCLGlCQUFpQixFQUFFLFFBQVE7UUFDM0IsbUJBQW1CLEVBQUUsVUFBVTtRQUMvQixtQkFBbUIsRUFBRSxRQUFRO1FBQzdCLHFCQUFxQixFQUFFLFVBQVU7UUFDakMsZ0JBQWdCLEVBQUUsUUFBUTtRQUMxQixrQkFBa0IsRUFBRSxVQUFVO1FBQzlCLHNCQUFzQixFQUFFLFFBQVE7UUFDaEMsd0JBQXdCLEVBQUUsVUFBVTtRQUNwQyxzQkFBc0IsRUFBRSxRQUFRO1FBQ2hDLHdCQUF3QixFQUFFLFVBQVU7UUFDcEMsa0JBQWtCLEVBQUUsUUFBUTtRQUM1QixvQkFBb0IsRUFBRSxVQUFVO1FBQ2hDLGlCQUFpQixFQUFFLFFBQVE7UUFDM0IsbUJBQW1CLEVBQUUsVUFBVTtRQUMvQixtQkFBbUIsRUFBRSxTQUFTO1FBQzlCLHFCQUFxQixFQUFFLFdBQVc7UUFDbEMsMkNBQTJDLEVBQUUsS0FBSztRQUNsRCw2Q0FBNkMsRUFBRSxPQUFPO1FBQ3RELGdCQUFnQixFQUFFLE1BQU07UUFDeEIsa0JBQWtCLEVBQUUsUUFBUTtRQUM1QixrQkFBa0IsRUFBRSxLQUFLO1FBQ3pCLG9CQUFvQixFQUFFLEtBQUs7UUFDM0IsSUFBSSxFQUFFLEtBQUssQ0FBQyxjQUFjO0tBQzNCLENBQUM7SUFRSixnQ0FBQztBQUFELENBQUMsQUE3Q0QsQ0FBK0MsZ0NBQWUsR0E2QzdEO0FBN0NZLGlDQUF5Qiw0QkE2Q3JDLENBQUE7QUFFRDtJQUE4Qyw0Q0FBYztJQUE1RDtRQUE4Qyw4QkFBYztJQUU1RCxDQUFDO0lBQUQsK0JBQUM7QUFBRCxDQUFDLEFBRkQsQ0FBOEMsK0JBQWMsR0FFM0Q7QUFGWSxnQ0FBd0IsMkJBRXBDLENBQUE7QUFFRDtJQUE0QywwQ0FBWTtJQUF4RDtRQUE0Qyw4QkFBWTtJQUV4RCxDQUFDO0lBRGUsK0JBQVEsR0FBRyxJQUFJLHNCQUFzQixDQUFDLHdCQUF3QixFQUFFLG1CQUFtQixFQUFFLHlCQUF5QixFQUFFLHdCQUF3QixDQUFDLENBQUM7SUFDMUosNkJBQUM7QUFBRCxDQUFDLEFBRkQsQ0FBNEMsNkJBQVksR0FFdkQ7QUFGWSw4QkFBc0IseUJBRWxDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgbW9kZWwvVHlwZVNjcmlwdE1vZGVsQ29udGFpbmVyLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAwOS4wOC4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgbW9kZWxcbiAqL1xuLyoqICovXG5cbmltcG9ydCB7TW9kZWxGYWN0b3J5LCBNb2RlbENvbnRhaW5lciwgTWV0YU1vZGVsLCBGaWVsZERlZmluaXRpb24sIEVudW1EZWZpbml0aW9ufSBmcm9tICcuL01vZGVsQ29udGFpbmVyJztcblxuZXhwb3J0IGNsYXNzIFR5cGVTY3JpcHRNb2RlbENvbnRhaW5lciBleHRlbmRzIE1vZGVsQ29udGFpbmVyIHtcbiAgcHVibGljIHN0YXRpYyBmYWN0b3J5OiBUeXBlU2NyaXB0TW9kZWxGYWN0b3J5O1xufVxuXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdE1ldGFNb2RlbCBleHRlbmRzIE1ldGFNb2RlbCB7XG4gIHB1YmxpYyBzdGF0aWMgZmFjdG9yeTogVHlwZVNjcmlwdE1vZGVsRmFjdG9yeTtcblxuICBtb2RlbENvbnRhaW5lcjogVHlwZVNjcmlwdE1vZGVsQ29udGFpbmVyO1xufVxuXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdEZpZWxkRGVmaW5pdGlvbiBleHRlbmRzIEZpZWxkRGVmaW5pdGlvbiB7XG4gIHB1YmxpYyBzdGF0aWMgZmFjdG9yeTogVHlwZVNjcmlwdE1vZGVsRmFjdG9yeTtcblxuICAvKipcbiAgICogQHNlZSBodHRwczovL3d3dy50eXBlc2NyaXB0bGFuZy5vcmcvZG9jcy9oYW5kYm9vay9iYXNpYy10eXBlcy5odG1sXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIHR5cGVNYXBwaW5nID0ge1xuICAgICdqYXZhLnV0aWwuTWFwJzogJ3sgW2tleTogc3RyaW5nXTogc3RyaW5nOyB9JyxcbiAgICAnamF2YS5sYW5nLlN0cmluZyc6ICdzdHJpbmcnLFxuICAgICdqYXZhLmxhbmcuU3RyaW5nW10nOiAnc3RyaW5nW10nLFxuICAgICdqYXZhLmxhbmcuQ2hhcmFjdGVyJzogJ3N0cmluZycsXG4gICAgJ2phdmEubGFuZy5DaGFyYWN0ZXJbXSc6ICdzdHJpbmdbXScsXG4gICAgJ2phdmEubGFuZy5CeXRlJzogJ251bWJlcicsXG4gICAgJ2phdmEubGFuZy5CeXRlW10nOiAnbnVtYmVyW10nLFxuICAgICdqYXZhLmxhbmcuU2hvcnQnOiAnbnVtYmVyJyxcbiAgICAnamF2YS5sYW5nLlNob3J0W10nOiAnbnVtYmVyW10nLFxuICAgICdqYXZhLmxhbmcuSW50ZWdlcic6ICdudW1iZXInLFxuICAgICdqYXZhLmxhbmcuSW50ZWdlcltdJzogJ251bWJlcltdJyxcbiAgICAnamF2YS5sYW5nLkxvbmcnOiAnbnVtYmVyJyxcbiAgICAnamF2YS5sYW5nLkxvbmdbXSc6ICdudW1iZXJbXScsXG4gICAgJ2phdmEubWF0aC5CaWdJbnRlZ2VyJzogJ251bWJlcicsXG4gICAgJ2phdmEubWF0aC5CaWdJbnRlZ2VyW10nOiAnbnVtYmVyW10nLFxuICAgICdqYXZhLm1hdGguQmlnRGVjaW1hbCc6ICdudW1iZXInLFxuICAgICdqYXZhLm1hdGguQmlnRGVjaW1hbFtdJzogJ251bWJlcltdJyxcbiAgICAnamF2YS5sYW5nLkRvdWJsZSc6ICdudW1iZXInLFxuICAgICdqYXZhLmxhbmcuRG91YmxlW10nOiAnbnVtYmVyW10nLFxuICAgICdqYXZhLmxhbmcuRmxvYXQnOiAnbnVtYmVyJyxcbiAgICAnamF2YS5sYW5nLkZsb2F0W10nOiAnbnVtYmVyW10nLFxuICAgICdqYXZhLmxhbmcuQm9vbGVhbic6ICdib29sZWFuJyxcbiAgICAnamF2YS5sYW5nLkJvb2xlYW5bXSc6ICdib29sZWFuW10nLFxuICAgICdjb20ubXdheXNvbHV0aW9ucy5nb2ZlcjIuZmlsZS5kb21haW4uRmlsZSc6ICdhbnknLFxuICAgICdjb20ubXdheXNvbHV0aW9ucy5nb2ZlcjIuZmlsZS5kb21haW4uRmlsZVtdJzogJ2FueVtdJyxcbiAgICAnamF2YS51dGlsLkRhdGUnOiAnRGF0ZScsXG4gICAgJ2phdmEudXRpbC5EYXRlW10nOiAnRGF0ZVtdJyxcbiAgICAnamF2YS5sYW5nLk9iamVjdCc6ICdhbnknLFxuICAgICdqYXZhLmxhbmcuT2JqZWN0W10nOiAnYW55JyxcbiAgICAnW0InOiAnYW55JyAvLyBCaW5hcnkgRGF0YVxuICB9O1xuXG4gIG1vZGVsOiBUeXBlU2NyaXB0TWV0YU1vZGVsO1xuXG4gIGdldCBkYXRhVHlwZVRTKCk6IHN0cmluZyB7XG4gICAgY29uc3QgdHlwZSA9IHRoaXMuZGF0YVR5cGVOb3JtYWxpemVkO1xuICAgIHJldHVybiBUeXBlU2NyaXB0RmllbGREZWZpbml0aW9uLnR5cGVNYXBwaW5nW3R5cGVdIHx8IHR5cGU7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFR5cGVTY3JpcHRFbnVtRGVmaW5pdGlvbiBleHRlbmRzIEVudW1EZWZpbml0aW9uIHtcbiAgcHVibGljIHN0YXRpYyBmYWN0b3J5OiBUeXBlU2NyaXB0TW9kZWxGYWN0b3J5O1xufVxuXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdE1vZGVsRmFjdG9yeSBleHRlbmRzIE1vZGVsRmFjdG9yeSB7XG4gIHB1YmxpYyBzdGF0aWMgaW5zdGFuY2UgPSBuZXcgVHlwZVNjcmlwdE1vZGVsRmFjdG9yeShUeXBlU2NyaXB0TW9kZWxDb250YWluZXIsIFR5cGVTY3JpcHRNZXRhTW9kZWwsIFR5cGVTY3JpcHRGaWVsZERlZmluaXRpb24sIFR5cGVTY3JpcHRFbnVtRGVmaW5pdGlvbik7XG59XG4iXX0=