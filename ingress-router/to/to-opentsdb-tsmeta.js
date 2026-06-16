'use strict';

const debug = require('debug')('ingress-router:to:to-opentsdb-tsmeta');
const request = require('request');

// Metric-Tags look-up table
const metricTagsMap = new Map();


let httpGetOptions = { 
	method: 'GET', 
	forever: true,
	pool: { maxSockets: 10 },
	timeout: 10000,
	uri: ''
};

let httpPostOptions = { 
	method: 'POST', 
	headers: { 'Content-Type': 'application/json' }, 
	forever: true,
	pool: { maxSockets: 100 },
	timeout: 50000,
	uri: '',
	body: ''
};


// Look up metric-tags in OpenTSDB
function lookupMetricTags(address, metricTags) {
	return new Promise((resolve, reject) => {
		try {
			let result = metricTagsMap.get(address + '/' + metricTags);
			if (result) {
				resolve(true);
				return;
			}

			httpGetOptions.uri = 
				'http://' + address + '/api/search/lookup?m=' + metricTags;

			request(httpGetOptions, (error, response, body) => {
				try {
					if (error) throw new Error(error);

					if (response) {
						if (response.statusCode === 200) {		// 200 OK
							metricTagsMap.set(
								address + '/' + metricTags, true);
							resolve(true);
						} else if (response.statusCode === 404) {
							// 404 Not Found
							resolve(false);
						} else {
							throw new Error(response.statusCode + '/' +
								response.statusMessage);
						}
					} else {
						throw new Error('No response: ' + metricTags);
					}
				} catch (err) {
					debug('ERROR: [OpenTSDB/LOOKUP_MTAGS]: %s: %s',
						address, err.message);
					reject(err);
				}
			});
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
		}
	});
}


// Create metric-tags in OpenTSDB
function createMetricTags(address, metricTags) {
	return new Promise((resolve, reject) => {
		try {
			let mtList = metricTags.split(/{|=|,|}/);

			let tagK = mtList[1], tagV = mtList[2];
			for (let i = 3; i < mtList.length - 1; ++i) {
				if (i % 2 === 1) {
					tagK += ',' + mtList[i];
				} else {
					tagV += ',' + mtList[i];
				}
			}

			httpGetOptions.uri =
				'http://' + address + '/api/uid/assign?metric=' + mtList[0] +
				'&tagk=' + tagK + '&tagv=' + tagV;

			request(httpGetOptions, (error, response, body) => {
				try {
					if (error) throw new Error(error);

					if (response) {
						if (response.statusCode === 200 ||
							response.statusCode === 400) {
							// 200 OK or 400 Bad Request (Partial success: 
							// Name already exists)
							metricTagsMap.set(
								address + '/' + metricTags, true);
							resolve();
						} else {
							throw new Error(response.statusCode + '/' +
								response.statusMessage);
						}
					} else {
						throw new Error('No response: ' + metricTags);
					}
				} catch (err) {
					debug('ERROR: [OpenTSDB/CREATE_MTAGS]: %s: %s',
						address, err.message);
					reject(err);
				}
			});
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
		}
	});
}


// Post TSMeta data to OpenTSDB
function postTSMeta(address, metricTags, toData) {
	return new Promise((resolve, reject) => {
		try {
			httpPostOptions.body = JSON.stringify(toData);
			httpPostOptions.uri = 
				'http://' + address + 
				'/api/uid/tsmeta?create=true&method_override=post&m=' +
				metricTags;

			request(httpPostOptions, (error, response, body) => {
				try {
					if (error) throw new Error(error);

					if (response) {
						if (response.statusCode === 200) {		// 200 OK
							debug('SUCCESS: [OpenTSDB/TSMETA]:', address);
							resolve();
						} else {
							debug('ERROR: [OpenTSDB/TSMETA]: %s (%d/%s): %o',
								response.request.uri.href, response.statusCode,
								response.statusMessage, response.request.body);
							reject(new Error(response.statusCode + '/' + 
								response.statusMessage));
						}
					} else {
						throw new Error('No response: ' + metricTags);
					}
				} catch (err) {
					debug('ERROR: [OpenTSDB/TSMETA]: %s: %s',
						address, err.message);
					reject(err);
				}
			});
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
		}
	});
}


// Forward a TSMeta query to an OpenTSDB server
function forward(irData, toData, address, toConf) {
	return new Promise(async (resolve, reject) => {
		try {
			debug('irData = %o', irData);

			let exist = 
				await lookupMetricTags(address, irData.service.metricTags);
			if (!exist) {
				await createMetricTags(address, irData.service.metricTags);
			}
			await postTSMeta(address, irData.service.metricTags, toData);
			resolve();
		} catch (err) {
			debug('ERROR:', err.message);
			reject(err);
		}
	});
}


module.exports = {
	forward: forward
};
