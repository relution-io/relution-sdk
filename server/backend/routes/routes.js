"use strict";
/**
* @file routes.ts
*/
var about = require('../package.json');
function init(app) {
    app.get('/index.json', 
    /**
    * provides an overview of available API, state, etc.
    *
    * @param req unused.
    * @param res body is an informal JSON that can be used for health monitoring, for example.
    * @return {*} unspecified value.
    */
    function getRoutes(req, res) {
        var index = {
            name: about.name,
            version: about.version,
            description: about.description,
            routes: app.routes
        };
        return res.json(index);
    });
}
exports.init = init;
//# sourceMappingURL=routes.js.map