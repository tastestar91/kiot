//----------------------------------------------------------------
// Ingress-router Sensor Data Monitor [Node.js]
//
// Dongwoo Kwon {dwkwon80@gmail.com}, 2019-04-25
// (last modified: 2020-05-14)
//----------------------------------------------------------------

'use strict';

if (!process.env.DEBUG) process.env.DEBUG = 'ir-sensor-data-monitor:*';

const debug = require('debug')('ir-sensor-data-monitor:app');
const express = require('express');
const cors = require('cors');

const { releaseAllModules } = require('./manager/module-manager');
const conf = require('./conf/config').sensorDataMonitor;

const inetPort = conf.port || 40101;
const apiRouteV1 = require('./routes/apiroute-v1');

const app = express();


app.use(cors());

app.use('/v1', apiRouteV1);

app.use((req, res, next) => res.sendStatus(404));


let expressWs = require('express-ws')(app);

expressWs.getWss().on('error', (error) => {
	debug('ERROR:', error);
	process.exit(1);
});

let sensorDataMonitor = app.listen(inetPort, () => {
	debug('Started Ingress-router Sensor Data Monitor on HTTP port %o',
		inetPort);
}).on('error', (err) => {
	debug('ERROR:', err);
	process.exit(1);
});


process.on('warning', (e) => debug('WARN:', e.stack));

process.on('unhandledRejection', (reason, p) => {
	debug('ERROR: UNHANDLED REJECTION at Promise: %O, Reason: %s, Stack: %s',
		p, reason, reason.stack);
});

process.on('uncaughtException', (err) => {
	debug('ERROR: UNCAUGHT EXCEPTION:', err);
});

['exit', 'SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
	process.on(signal, (code) => {
		releaseAllModules();

		if (expressWs) {
			try {
				let wss = expressWs.getWss();
				if (wss) {
					wss.clients.forEach((client) => {
						client.close();
					});
					wss.close();
				}
				expressWs = null;
			} catch (err) {
				debug('ERROR:', err);
			}
		}
		
		if (sensorDataMonitor) {
			sensorDataMonitor.close();
			sensorDataMonitor = null;
		}

		if (signal === 'exit') {
			debug('Stopped Ingress-router Sensor Data Monitor');
		} else {
			process.exit(code);
		}
	})
});


module.exports = app;
