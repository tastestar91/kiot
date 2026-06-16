'use strict';

const debug = require('debug')('ingress-router:routes:apiroute-v1');
const expressRouter = require('express').Router();

const preprocessor = require('../preprocessor/preprocessor');
const enricher = require('../enricher/enricher');
const monitor = require('../monitor/monitor'); 
const router = require('../to/router');
const postprocessor = require('../postprocessor/postprocessor');

const hostname = require('os').hostname();


// Create Ingress-router data (irData) by wrapping API request data
function wrapReqData(req) {
	try {
		let irData = {
			service: {
				timestamp: ~~(Date.now() / 1000)
			},
			data: {},
			log: []
		};

		if (req.method === 'GET') {
			if (Object.keys(req.query).length === 0) {
				throw new Error('No GET parameters');
			}

			if (req.params.sid) {	// e.g.) /v1/sensors/(serviceId)?...
				irData.service.id = req.params.sid;
			} else {				// e.g.) /v1/sensors?sid=(serviceId)&...
				if (!req.query.sid) {
					throw new Error('No service ID');
				}

				irData.service.id = req.query.sid;
			}

			irData.request = req.query;
		} else if (req.method === 'POST') {
			if (Object.keys(req.body).length === 0) {
				throw new Error('No POST body');
			}

			if (req.params.sid) {	// e.g.) /v1/sensors/(serviceId)
				irData.service.id = req.params.sid;
				irData.request = req.body;
			} else {	// e.g.) /v1/sensors, BODY={"service": {}, "data": {}}
				if (!req.body.service.id) {
					throw new Error('No service ID');
				}

				irData.service = req.body.service;
				irData.request = req.body.data;
			}
		} else {
			throw new Error('Unsupported the HTTP method: ' + req.method);
		}

		irData.service.apiMethod = req.method;
		irData.service.apiPath = req.baseUrl + req.path;
		irData.service.apiUrlQuery = req._parsedUrl.query;
		irData.service.irHostname = hostname;
		return irData;
	} catch (err) {
		debug('ERROR:', err.message);
		throw new Error(400);
	}
}


// Process 'GET /sensors' and 'POST /sensors' API requests
async function getpostSensors(req, res, next) {
	let irData = {}, routingConf = {};

	try {
		irData = wrapReqData(req);
		routingConf = await router.getRoutingConf(irData.service);
		irData =
			await preprocessor.preprocess(irData, routingConf.preprocessor);
		irData = await enricher.enrich(irData, routingConf.enricher);
		monitor.monitor(irData, routingConf.monitor);
		irData = await router.route(irData, routingConf.to);
	} catch (err) {
		debug('ERROR: %s %s: %s', req.method, req.path, err.message);
		irData.error = { statusCode: err.message };
	}

	try {
		let response =
			await postprocessor.postprocess(irData, routingConf.postprocessor);

		if (response.message !== undefined) {
			res.status(response.statusCode).send(response.message);
		} else {
			res.sendStatus(response.statusCode);
		}
	} catch (err) {
		debug('ERROR: %s %s: %s', req.method, req.path, err.message);
		res.sendStatus(500);
	}
}


// Process a 'POST /enrichers' API request
async function postEnrichers(req, res, next) {
	try {
		let routingConf = await router.getRoutingConf(req.body.service);
		res.sendStatus(await router.route(req.body, routingConf.to));
	} catch (err) {
		debug('ERROR: %s %s: %s', req.method, req.path, err.message);
		res.sendStatus(400);	// Bad request
	}
}


// Process a 'POST /servers' API request
function postServers(req, res, next) {
    try {
        if (!Array.isArray(req.body.dataset)) {
			req.body.dataset = [ req.body.dataset ];
        }

		for (let dt of req.body.dataset) {
			router.getRoutingConf(dt.service).then((routingConf) => {
				return router.route(dt, routingConf.to)
			}).catch((err) => {
				debug('ERROR: %s %s: %s', req.method, req.path, err.message);
			});
        }

		res.sendStatus(202);	// Accepted
    } catch (err) {
		debug('ERROR: %s %s: %s', req.method, req.path, err.message);
		res.sendStatus(400);	// Bad request
    }
}


// Express router
expressRouter.get('/sensors/:sid', getpostSensors);
expressRouter.get('/sensors', getpostSensors);
expressRouter.post('/sensors/:sid', getpostSensors);
expressRouter.post('/sensors', getpostSensors);
expressRouter.post('/enrichers', postEnrichers);
expressRouter.post('/servers', postServers);
expressRouter.use((req, res, next) => res.sendStatus(404));


module.exports = expressRouter;
