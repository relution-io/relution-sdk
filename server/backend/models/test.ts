const backbone = require('backbone');
const datasync = require('relution/datasync.js');

export const options = {
    entity: 'test',
    type: {
        container: 'relutionsdk MetaModelContainer',
        model: 'test'
    },

    idAttribute: '_id',

    backbone: backbone,
    sync: datasync.sync
};
