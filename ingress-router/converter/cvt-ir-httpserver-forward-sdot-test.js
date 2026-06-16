'use strict';

const debug =
	require('debug')('ingress-router:converter:cvt-ir-httpserver-forward-sdot-test');


// Create a GET query to forward the received query to another HTTP server
function convert(irData, toData, toConf) {
	return new Promise((resolve, reject) => {
		try {

			resolve({
				method: 'GET',
				uri: '?' + irData.service.apiUrlQuery
			});

			/*
			let idx = irData.service.deviceId.slice(-1);
			if (idx < 5) {
				resolve({
					method: 'GET',
					uri: '?' + irData.service.apiUrlQuery
				});
			}
			else {
				resolve();
				return;
			}
			*/


		} catch (err) {
			debug('ERROR: %s: %s: %s',
				irData.service.id, irData.service.deviceId, err);
			reject(err);
		}
	});
}


module.exports = {
	convert: convert
};
