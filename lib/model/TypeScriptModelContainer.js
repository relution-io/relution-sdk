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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHlwZVNjcmlwdE1vZGVsQ29udGFpbmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21vZGVsL1R5cGVTY3JpcHRNb2RlbENvbnRhaW5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOzs7Ozs7O0FBRU4sK0JBQXVGLGtCQUFrQixDQUFDLENBQUE7QUFFMUc7SUFBOEMsNENBQWM7SUFBNUQ7UUFBOEMsOEJBQWM7SUFFNUQsQ0FBQztJQUFELCtCQUFDO0FBQUQsQ0FBQyxBQUZELENBQThDLCtCQUFjLEdBRTNEO0FBRlksZ0NBQXdCLDJCQUVwQyxDQUFBO0FBRUQ7SUFBeUMsdUNBQVM7SUFBbEQ7UUFBeUMsOEJBQVM7SUFJbEQsQ0FBQztJQUFELDBCQUFDO0FBQUQsQ0FBQyxBQUpELENBQXlDLDBCQUFTLEdBSWpEO0FBSlksMkJBQW1CLHNCQUkvQixDQUFBO0FBRUQ7SUFBK0MsNkNBQWU7SUFBOUQ7UUFBK0MsOEJBQWU7SUE2QzlELENBQUM7SUFKQyxzQkFBSSxpREFBVTthQUFkO1lBQ0UsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDO1lBQ3JDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDO1FBQzdELENBQUM7OztPQUFBO0lBekNEOztPQUVHO0lBQ1cscUNBQVcsR0FBRztRQUMxQixlQUFlLEVBQUUsNEJBQTRCO1FBQzdDLGtCQUFrQixFQUFFLFFBQVE7UUFDNUIsb0JBQW9CLEVBQUUsVUFBVTtRQUNoQyxxQkFBcUIsRUFBRSxRQUFRO1FBQy9CLHVCQUF1QixFQUFFLFVBQVU7UUFDbkMsZ0JBQWdCLEVBQUUsUUFBUTtRQUMxQixrQkFBa0IsRUFBRSxVQUFVO1FBQzlCLGlCQUFpQixFQUFFLFFBQVE7UUFDM0IsbUJBQW1CLEVBQUUsVUFBVTtRQUMvQixtQkFBbUIsRUFBRSxRQUFRO1FBQzdCLHFCQUFxQixFQUFFLFVBQVU7UUFDakMsZ0JBQWdCLEVBQUUsUUFBUTtRQUMxQixrQkFBa0IsRUFBRSxVQUFVO1FBQzlCLHNCQUFzQixFQUFFLFFBQVE7UUFDaEMsd0JBQXdCLEVBQUUsVUFBVTtRQUNwQyxzQkFBc0IsRUFBRSxRQUFRO1FBQ2hDLHdCQUF3QixFQUFFLFVBQVU7UUFDcEMsa0JBQWtCLEVBQUUsUUFBUTtRQUM1QixvQkFBb0IsRUFBRSxVQUFVO1FBQ2hDLGlCQUFpQixFQUFFLFFBQVE7UUFDM0IsbUJBQW1CLEVBQUUsVUFBVTtRQUMvQixtQkFBbUIsRUFBRSxTQUFTO1FBQzlCLHFCQUFxQixFQUFFLFdBQVc7UUFDbEMsMkNBQTJDLEVBQUUsS0FBSztRQUNsRCw2Q0FBNkMsRUFBRSxPQUFPO1FBQ3RELGdCQUFnQixFQUFFLE1BQU07UUFDeEIsa0JBQWtCLEVBQUUsUUFBUTtRQUM1QixrQkFBa0IsRUFBRSxLQUFLO1FBQ3pCLG9CQUFvQixFQUFFLEtBQUs7UUFDM0IsSUFBSSxFQUFFLEtBQUssQ0FBQyxjQUFjO0tBQzNCLENBQUM7SUFRSixnQ0FBQztBQUFELENBQUMsQUE3Q0QsQ0FBK0MsZ0NBQWUsR0E2QzdEO0FBN0NZLGlDQUF5Qiw0QkE2Q3JDLENBQUE7QUFFRDtJQUE4Qyw0Q0FBYztJQUE1RDtRQUE4Qyw4QkFBYztJQUU1RCxDQUFDO0lBQUQsK0JBQUM7QUFBRCxDQUFDLEFBRkQsQ0FBOEMsK0JBQWMsR0FFM0Q7QUFGWSxnQ0FBd0IsMkJBRXBDLENBQUE7QUFFRDtJQUE0QywwQ0FBWTtJQUF4RDtRQUE0Qyw4QkFBWTtJQUV4RCxDQUFDO0lBRGUsK0JBQVEsR0FBRyxJQUFJLHNCQUFzQixDQUFDLHdCQUF3QixFQUFFLG1CQUFtQixFQUFFLHlCQUF5QixFQUFFLHdCQUF3QixDQUFDLENBQUM7SUFDMUosNkJBQUM7QUFBRCxDQUFDLEFBRkQsQ0FBNEMsNkJBQVksR0FFdkQ7QUFGWSw4QkFBc0IseUJBRWxDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gKiBAZmlsZSBtb2RlbC9UeXBlU2NyaXB0TW9kZWxDb250YWluZXIudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDA5LjA4LjIwMTZcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIG1vZGVsXHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbmltcG9ydCB7TW9kZWxGYWN0b3J5LCBNb2RlbENvbnRhaW5lciwgTWV0YU1vZGVsLCBGaWVsZERlZmluaXRpb24sIEVudW1EZWZpbml0aW9ufSBmcm9tICcuL01vZGVsQ29udGFpbmVyJztcclxuXHJcbmV4cG9ydCBjbGFzcyBUeXBlU2NyaXB0TW9kZWxDb250YWluZXIgZXh0ZW5kcyBNb2RlbENvbnRhaW5lciB7XHJcbiAgcHVibGljIHN0YXRpYyBmYWN0b3J5OiBUeXBlU2NyaXB0TW9kZWxGYWN0b3J5O1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdE1ldGFNb2RlbCBleHRlbmRzIE1ldGFNb2RlbCB7XHJcbiAgcHVibGljIHN0YXRpYyBmYWN0b3J5OiBUeXBlU2NyaXB0TW9kZWxGYWN0b3J5O1xyXG5cclxuICBtb2RlbENvbnRhaW5lcjogVHlwZVNjcmlwdE1vZGVsQ29udGFpbmVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdEZpZWxkRGVmaW5pdGlvbiBleHRlbmRzIEZpZWxkRGVmaW5pdGlvbiB7XHJcbiAgcHVibGljIHN0YXRpYyBmYWN0b3J5OiBUeXBlU2NyaXB0TW9kZWxGYWN0b3J5O1xyXG5cclxuICAvKipcclxuICAgKiBAc2VlIGh0dHBzOi8vd3d3LnR5cGVzY3JpcHRsYW5nLm9yZy9kb2NzL2hhbmRib29rL2Jhc2ljLXR5cGVzLmh0bWxcclxuICAgKi9cclxuICBwdWJsaWMgc3RhdGljIHR5cGVNYXBwaW5nID0ge1xyXG4gICAgJ2phdmEudXRpbC5NYXAnOiAneyBba2V5OiBzdHJpbmddOiBzdHJpbmc7IH0nLFxyXG4gICAgJ2phdmEubGFuZy5TdHJpbmcnOiAnc3RyaW5nJyxcclxuICAgICdqYXZhLmxhbmcuU3RyaW5nW10nOiAnc3RyaW5nW10nLFxyXG4gICAgJ2phdmEubGFuZy5DaGFyYWN0ZXInOiAnc3RyaW5nJyxcclxuICAgICdqYXZhLmxhbmcuQ2hhcmFjdGVyW10nOiAnc3RyaW5nW10nLFxyXG4gICAgJ2phdmEubGFuZy5CeXRlJzogJ251bWJlcicsXHJcbiAgICAnamF2YS5sYW5nLkJ5dGVbXSc6ICdudW1iZXJbXScsXHJcbiAgICAnamF2YS5sYW5nLlNob3J0JzogJ251bWJlcicsXHJcbiAgICAnamF2YS5sYW5nLlNob3J0W10nOiAnbnVtYmVyW10nLFxyXG4gICAgJ2phdmEubGFuZy5JbnRlZ2VyJzogJ251bWJlcicsXHJcbiAgICAnamF2YS5sYW5nLkludGVnZXJbXSc6ICdudW1iZXJbXScsXHJcbiAgICAnamF2YS5sYW5nLkxvbmcnOiAnbnVtYmVyJyxcclxuICAgICdqYXZhLmxhbmcuTG9uZ1tdJzogJ251bWJlcltdJyxcclxuICAgICdqYXZhLm1hdGguQmlnSW50ZWdlcic6ICdudW1iZXInLFxyXG4gICAgJ2phdmEubWF0aC5CaWdJbnRlZ2VyW10nOiAnbnVtYmVyW10nLFxyXG4gICAgJ2phdmEubWF0aC5CaWdEZWNpbWFsJzogJ251bWJlcicsXHJcbiAgICAnamF2YS5tYXRoLkJpZ0RlY2ltYWxbXSc6ICdudW1iZXJbXScsXHJcbiAgICAnamF2YS5sYW5nLkRvdWJsZSc6ICdudW1iZXInLFxyXG4gICAgJ2phdmEubGFuZy5Eb3VibGVbXSc6ICdudW1iZXJbXScsXHJcbiAgICAnamF2YS5sYW5nLkZsb2F0JzogJ251bWJlcicsXHJcbiAgICAnamF2YS5sYW5nLkZsb2F0W10nOiAnbnVtYmVyW10nLFxyXG4gICAgJ2phdmEubGFuZy5Cb29sZWFuJzogJ2Jvb2xlYW4nLFxyXG4gICAgJ2phdmEubGFuZy5Cb29sZWFuW10nOiAnYm9vbGVhbltdJyxcclxuICAgICdjb20ubXdheXNvbHV0aW9ucy5nb2ZlcjIuZmlsZS5kb21haW4uRmlsZSc6ICdhbnknLFxyXG4gICAgJ2NvbS5td2F5c29sdXRpb25zLmdvZmVyMi5maWxlLmRvbWFpbi5GaWxlW10nOiAnYW55W10nLFxyXG4gICAgJ2phdmEudXRpbC5EYXRlJzogJ0RhdGUnLFxyXG4gICAgJ2phdmEudXRpbC5EYXRlW10nOiAnRGF0ZVtdJyxcclxuICAgICdqYXZhLmxhbmcuT2JqZWN0JzogJ2FueScsXHJcbiAgICAnamF2YS5sYW5nLk9iamVjdFtdJzogJ2FueScsXHJcbiAgICAnW0InOiAnYW55JyAvLyBCaW5hcnkgRGF0YVxyXG4gIH07XHJcblxyXG4gIG1vZGVsOiBUeXBlU2NyaXB0TWV0YU1vZGVsO1xyXG5cclxuICBnZXQgZGF0YVR5cGVUUygpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgdHlwZSA9IHRoaXMuZGF0YVR5cGVOb3JtYWxpemVkO1xyXG4gICAgcmV0dXJuIFR5cGVTY3JpcHRGaWVsZERlZmluaXRpb24udHlwZU1hcHBpbmdbdHlwZV0gfHwgdHlwZTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUeXBlU2NyaXB0RW51bURlZmluaXRpb24gZXh0ZW5kcyBFbnVtRGVmaW5pdGlvbiB7XHJcbiAgcHVibGljIHN0YXRpYyBmYWN0b3J5OiBUeXBlU2NyaXB0TW9kZWxGYWN0b3J5O1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVHlwZVNjcmlwdE1vZGVsRmFjdG9yeSBleHRlbmRzIE1vZGVsRmFjdG9yeSB7XHJcbiAgcHVibGljIHN0YXRpYyBpbnN0YW5jZSA9IG5ldyBUeXBlU2NyaXB0TW9kZWxGYWN0b3J5KFR5cGVTY3JpcHRNb2RlbENvbnRhaW5lciwgVHlwZVNjcmlwdE1ldGFNb2RlbCwgVHlwZVNjcmlwdEZpZWxkRGVmaW5pdGlvbiwgVHlwZVNjcmlwdEVudW1EZWZpbml0aW9uKTtcclxufVxyXG4iXX0=