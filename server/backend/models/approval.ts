const backbone = require('backbone');
const datasync = require('relution/datasync.js');

export const options = {
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
