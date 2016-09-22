"use strict";
var backbone = require('backbone');
var datasync = require('relution/datasync.js');
exports.options = {
    entity: 'user',
    type: {
        container: 'relutionsdk MetaModelContainer',
        model: 'user'
    },
    idAttribute: 'id',
    backbone: backbone,
    sync: datasync.sync
};
//# sourceMappingURL=user.js.map