'use strict';

const debug = require('debug')('ingress-router:to:to-tcp-server');

const tcp = require('../manager/man-tcp');


// Forward data to a TCP server
function forward(irData, toData, address, toConf) {
	return new Promise((resolve, reject) => {
		try {
			if (typeof toData !== 'string') {
				toData = JSON.stringify(toData);
			}

			tcp.send(address, toData).then((result) => {
				resolve();
			}).catch((err) => {
				debug('ERROR: [TCPSRV/SEND]: %s: %s', address, err.message);
				reject(err);
			});
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
		}
	});
}


module.exports = {
	forward: forward
};
