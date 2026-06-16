'use strict';

const debug = require('debug')('ingress-router:to:to-https-server');
const request = require('request');

const httpOptions = { 
	forever: true,
	pool: { maxSockets: 10 },
	timeout: 5000
};


// Forward data to a HTTPS server (NOT FULLY IMPLEMENTED)
function forward(irData, toData, address, toConf) {
	return new Promise(async (resolve, reject) => {
		try {
			if (toConf.method) {
				let data, headers;

				if (typeof toData === 'string') {
					data = toData;
				} else {
					data = JSON.stringify(toData);
					headers = { 'Content-Type': 'application/json' };
				}

				toData = {
					method: toConf.method,
					uri: 'https://' + address,
					headers: headers,
					body: data
				};
			} else {
				toData.uri = 'https://' + address + toData.uri;
			}

			request(Object.assign(toData, httpOptions),
				(error, response, body) => {
				try {
					if (error) throw new Error(error);

					if (response) {
						if (response.statusCode < 400) {
							debug('SUCCESS: [HTTPS_SRV]: %s: Body = %s',
								address, body);
							resolve();
						} else {
							debug('ERROR: [HTTPS_SRV]: %s (%d/%s): %o',
								response.request.uri.href, response.statusCode,
								response.statusMessage, response.request.body);
							throw new Error(response.statusCode + '/' + 
								response.statusMessage);
						}
					} else {
						throw new Error('No response');
					}
				} catch (err) {
					debug('ERROR: [HTTPS_SRV]: %s: %s', address, err.message);
					reject(err);
				}
			});
		} catch (err) {
			debug('ERROR:', err.message);
			reject(err);
		}
	});
}


module.exports = {
	forward: forward
};
