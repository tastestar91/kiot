'use strict';

const debug =
	require('debug')('ingress-router:converter:cvt-ir-httpserver-forward-get');


// Create a GET query to forward the received query to another HTTP server
function convert(irData, toData, toConf) {
	return new Promise((resolve, reject) => {
		try {
			resolve({
				method: 'GET',
				uri: '?' + irData.service.apiUrlQuery
			});
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
