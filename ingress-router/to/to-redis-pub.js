'use strict';

const debug = require('debug')('ingress-router:to:to-redis-pub');

const redis = require('../manager/man-redis');


// Publish data to a Redis server
function forward(irData, toData, address, toConf) {
	return new Promise((resolve, reject) => {
		try {
			if (toConf.channel) {
				toData = [
					{
						channel: toConf.channel,
						data: typeof toData === 'string' ? toData :
							JSON.stringify(toData)
					}
				];
			}

			for (let index = 0; index < toData.length; ++index) {
				try {
					if (!toData[index].channel) {
						throw new Error(
							'Channel name for Redis not specified: ' +
							irData.service.id + ': ' + irData.service.deviceId
						);
					}

					redis.publish(address, toData[index].channel,
						toData[index].data, toConf.forwarding.password)
						.then((result) => {
							if (index === 0) resolve();
						})
						.catch((err) => {
							debug('ERROR: [Redis/PUB]: %s: %s: %s', 
								address, toData[index].channel, err.message);
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
