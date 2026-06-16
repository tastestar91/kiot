'use strict';

const debug = require('debug')('ingress-router:to:to-redis');

const redis = require('../manager/man-redis');


// Set key-value data to a Redis server
function forward(irData, toData, address, toConf) {
	return new Promise((resolve, reject) => {
		try {
			if (toConf.key) {
				toData = [
					{
						key: toConf.key,
						value: typeof toData === 'string' ? toData :
							JSON.stringify(toData)
					}
				];
			}

			for (let index = 0; index < toData.length; ++index) {
				try {
					if (!toData[index].key) {
						throw new Error(
							'Key name for Redis not specified: ' +
							irData.service.id + ': ' + irData.service.deviceId
						);
					}

					redis.set(address, toData[index].key,
						toData[index].value, toConf.forwarding.password)
						.then((result) => {
							if (index === 0) resolve();
						})
						.catch((err) => {
							debug('ERROR: [Redis/SET]: %s: %s: %s', 
								address, toData[index].key, err.message);
							if (index === 0) reject(err);
						});
				} catch (err) {
					debug('ERROR:', err.message);
				}
			}
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
		}
	});
}


module.exports = {
	forward: forward,
};
