'use strict';

const debug = require('debug')('ingress-router:to:to-mqtt');

const mqtt = require('../manager/man-mqtt');


// Forward data to a MQTT broker
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
						throw new Error('MQTT channel not specified: ' +
							irData.service.id + ': ' + irData.service.deviceId
						);
					}

					mqtt.publish(address, toData[index].channel, 
						toData[index].data, toConf.forwarding.username, 
						toConf.forwarding.password)
						.then((result) => {
							if (index === 0) resolve();
						})
						.catch((err) => {
							debug('ERROR: [MQTT/PUB]: %s: %s: %s', 
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
