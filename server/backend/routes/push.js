"use strict";
// Relution APIs
var pushService = require('relution/push.js');
var Q = require('q');
/**
* module providing direct access to push.
*
* registers a push target device.
*
* <p>
* The method attempts fetching an existing device using the metadata
* information given. This either works by providing a UUID or using
* heuristics based on information typically extracted using Cordova device
* plugin. The latter approach solves the potential problem when the client
* is uninstalled and reinstalled so that device local information is lost.
* </p>
* <p>
* If it finds one, that device is updated. Otherwise a new
* device is created and stored in the database.
* </p>
* @link [RelutionSDK Push APi](https://relution-io.github.io/relution-sdk/modules/_push_push_.html)
* @param app express.js application to hook into.
*/
function init(app) {
    app.post('/api/v1/push/registration', 
    /**
    * register the device on the push Service
    *
    * @param req containing body JSON to pass as input.
    * @param res result of call is provided as JSON body data.
    * @param next function to invoke error handling.
    */
    function serviceCall(req, res, next) {
        Q(pushService.registerPushDevice(req.body)).then(res.json.bind(res), next).done();
    });
    app.post('/api/v1/push', 
    /**
    * posts push notification(s).
    *
    * @param req containing body JSON to pass as input.
    * @param res result of call is provided as JSON body data.
    * @param next function to invoke error handling.
    */
    function serviceCall(req, res, next) {
        Q(pushService.postPushNotification(req.body)).then(res.json.bind(res), next).done();
    });
    app.get('/api/v1/push/:uuid', 
    /**
    * gets push notification status.
    *
    * @param req containing body JSON to pass as input.
    * @param res result of call is provided as JSON body data.
    * @param next function to invoke error handling.
    */
    function serviceCall(req, res, next) {
        Q(pushService.fetchPushNotification(req.params.uuid)).then(res.json.bind(res), next).done();
    });
}
exports.init = init;
//# sourceMappingURL=push.js.map