"use strict";
var backbone = require('backbone');
var datasync = require('relution/datasync.js');
exports.options = {
    entity: 'test',
    type: {
        container: 'relutionsdk MetaModelContainer',
        model: 'test'
    },
    idAttribute: '_id',
    backbone: backbone,
    sync: datasync.sync
};
//# sourceMappingURL=test.js.map