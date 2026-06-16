'use strict';

const debug = require('debug')
	('ingress-router:converter:cvt-kw-sensor-v1-opentsdb-iaq-vent');
const memStoreRedis = require('../manager/man-memstore-redis');

const keyPrefix = 'kw/iaq/cmd/v1/';


// Convert K-Weather IAQ-VENT data to the OpenTSDB JSON API format
function convert(irData, toData, toConf) {
	return new Promise(async (resolve, reject) => {
		try {
			if (!toConf.metric) {
				throw new Error('No OpenTSDB metric: ' + irData.service.id);
			}

			let data = 
				await memStoreRedis.get(keyPrefix + irData.service.deviceId);
			if (!data || data.vent.length < 1) {
				resolve();
				return;
			}

			toData = [];
			let metric = toConf.metric + '.' + irData.service.deviceId;

			// IAQ-VENT data
			for (let i = 0; i < data.vent.length; ++i) {
				if (data.vent[i].ai_mode === undefined) continue;

				try {
					toData.push({
						timestamp: irData.service.timestamp,
						value: data.vent[i].ai_mode,
						metric: metric,
						tags: {
							serial: data.vent[i].serial
						}
					});
				} catch (err) {
					debug('ERROR: %s: %s: %s', irData.service.id,
						irData.service.deviceId, err.message);
				}
			}

			resolve(toData);
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
