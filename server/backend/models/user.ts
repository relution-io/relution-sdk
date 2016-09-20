const backbone = require('backbone');
const datasync = require('relution/datasync.js');

export const options = {
    entity: 'user',
    type: {
        container: 'relutionsdk MetaModelContainer',
        model: 'user'
    },

    idAttribute: 'id',

    backbone: backbone,
    sync: datasync.sync
};
