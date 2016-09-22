/**
 * @file routes/connectors.js
 * relutionsdk Backend
 */

// Relution APIs
const connector = require('relution/connector.js');
/**
 * module providing direct access to connectors.
 *
 * Used by Relution SDK connectors module for direct access to backend servers. If you do not want
 * or need this functionality, the routes defined herein can be removed.
 *
 * @param app express.js application to hook into.
 */
export function init(app: any) {
  app.post('/api/v1/connectors/:connection',
    /**
     * installs session data such as credentials.
     *
     * @param req containing body JSON to pass as input.
     * @param res result of call is provided as JSON body data.
     * @param next function to invoke error handling.
     */
    function serviceCall(req: any, res: any, next: any) {
      connector.configureSession(req.params.connection, req.body);
      res.send(204); // success --> 204 no content
    }
  );

  app.post('/api/v1/connectors/:connection/:call',
    /**
     * calls directly into a service connection.
     *
     * @param req containing body JSON to pass as input.
     * @param res result of call is provided as JSON body data.
     * @param next function to invoke error handling.
     */
    function serviceCall(req: any, res: any, next: any) {
      connector.runCall(req.params.connection, req.params.call, req.body).then(res.json.bind(res), next).done();
    }
  );
}
