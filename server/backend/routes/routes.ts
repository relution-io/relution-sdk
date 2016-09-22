/**
* @file routes.ts
*/
const about = require('../package.json');

export function init(app: any) {
  app.get('/index.json',
    /**
    * provides an overview of available API, state, etc.
    *
    * @param req unused.
    * @param res body is an informal JSON that can be used for health monitoring, for example.
    * @return {*} unspecified value.
    */
    function getRoutes(req: any, res: any) {
      const index = {
        name: about.name,
        version: about.version,
        description: about.description,
        routes: app.routes
      };
      return res.json(index);
  });
}
