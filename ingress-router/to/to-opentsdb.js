'use strict';

const debug = require('debug')('ingress-router:to:to-opentsdb');
const request = require('request');

// Maximum number of data points per HTTP request
const dpsPerRequest = 100;


let httpOptions = { 
	method: 'POST', 
	headers: { 'Content-Type': 'application/json' }, 
	forever: true,
	pool: { maxSockets: 100 },
	timeout: 50000,
	uri: '',
	body: ''
};


// Post time series data to OpenTSDB
function postTSData(uri, data) {
	return new Promise((resolve, reject) => {
		try {
			httpOptions.body = JSON.stringify(data);
			httpOptions.uri = uri;

			request(httpOptions, (error, response, body) => {
				try {
					if (error) throw new Error(error);

					if (response) {
						if (response.statusCode === 204) {	// 204 No Content
							debug('SUCCESS: [OpenTSDB/PUT]:', uri);
							resolve();
						} else {
							debug('ERROR: [OpenTSDB/PUT]: %s (%d/%s): %o',
								uri, response.statusCode,
								response.statusMessage, response.request.body);
							reject(new Error(response.statusCode + '/' +
								response.statusMessage));
						}
					} else {
						throw new Error('No response');
					}
				} catch (err) {
					debug('ERROR: [OpenTSDB/PUT]: %s: %s', uri, err.message);
					reject(err);
				}
			});
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
		}
	});
}


// Forward a PUT query to an OpenTSDB server
function forward(irData, toData, address, toConf) {
	return new Promise(async (resolve, reject) => {
		try {
			let uri = 'http://' + address + '/api/put';

			if (toData.length <= dpsPerRequest) {
				await postTSData(uri, toData);
				resolve();
			} else {
				let idx, promises = [];
				for (idx = 0; idx < toData.length; idx += dpsPerRequest) {
					promises.push(
						postTSData(uri, toData.slice(idx, idx + dpsPerRequest))
					);
				}

				let results = await Promise.allSettled(promises), error = '';
				for (idx = 0; idx < results.length; ++idx) {
					if (results[idx].reason) {
						error += results[idx].reason.message + '; ';
					}
				}

				if (error) {
					reject(new Error(error));
				} else {
					resolve();
				}
			}
		} catch (err) {
			debug('ERROR:', err.message);
			reject(err);
		}
	});
}


module.exports = {
	forward: forward
};
