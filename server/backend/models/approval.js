"use strict";
var backbone = require('backbone');
var datasync = require('relution/datasync.js');
exports.options = {
    entity: 'approvals',
    type: {
        container: 'relutionsdk MetaModelContainer',
        model: 'approval'
    },
    idAttribute: 'id',
    aclAttribute: 'aclEntries',
    backbone: backbone,
    sync: datasync.sync
};
//# sourceMappingURL=approval.js.map