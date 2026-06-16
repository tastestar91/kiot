'use strict';

const debug = require('debug')('ingress-router:manager:man-http');
const request = require('request');

const moduleManager = require('./module-manager');

let httpGetOptions = {
	method: 'GET',
	forever: true,
	pool: { maxSockets: 10 },
	timeout: 5000,
	uri: undefined
};

moduleManager.registerModuleReleaseHandler(release);


// HTTP GET request
function get(uri) {
	return new Promise((resolve, reject) => {
		try {
			httpGetOptions.uri = uri;

			request(httpGetOptions, (error, response, body) => {
				try {
					if (error) throw new Error(error);

					if (response) {
						if (response.statusCode < 400) {
							debug('SUCCESS: [HTTP/GET]:', uri);
							resolve(body);
						} else {
							debug('ERROR: [HTTP/GET]: %s (%d/%s)', uri,
								response.statusCode, response.statusMessage);
							throw new Error(response.statusCode + '/' +
								response.statusMessage);
						}
					} else {
						throw new Error('No response');
					}
				} catch (err) {
					debug('ERROR: [HTTP/GET]: %s: %s', uri, err.message);
					reject(err);
				}
			});
		} catch (err) {
			debug('ERROR: [HTTP/GET]: %s: %s', uri, err.message);
			reject(err);
		}
	});
}


// Release all resources
function release() {
	httpGetOptions.uri = undefined;
} 


module.exports = {
	get: get
};
