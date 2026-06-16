'use strict';

const debug = 
	require('debug')('ingress-router:enricher:enr-kw-sensor-pm-oaq-v1');
const memStoreRedis = require('../manager/man-memstore-redis');

const keyPrefix = 'kw/oaq/pm/v1/';


// Correct K-Weather OAQ PM sensor data and add corrected data (version 1)
function enrich(irData) {
	return new Promise(async (resolve, reject) => {
		try {
			if (irData.data.pm10_raw === undefined && 
				irData.data.pm25_raw === undefined) {
				resolve();
				return;
			}

			let data = 
				await memStoreRedis.get(keyPrefix + irData.service.deviceId);
			if (!data) {
				debug('WARN: No OAQ PM correction data: %s: %s',
					irData.service.id, irData.service.deviceId);
				resolve();
				return;
			}

			let items = {};

			// PM10 data
			try {
				items.pm10 = 
					Math.round(irData.data.pm10_raw * data.sensors.pm10.ratio);
				items.pm10_ratio = data.sensors.pm10.ratio;
				items.pm10_offset = data.sensors.pm10.offset;
			} catch (err) {
				if (irData.data.pm10_raw !== undefined) {
					debug('ERROR:', err.message);
				}
			}

			// PM2.5 data
			try {
				items.pm25 = 
					Math.round(irData.data.pm25_raw * data.sensors.pm25.ratio);
				items.pm25_ratio = data.sensors.pm25.ratio;
				items.pm25_offset = data.sensors.pm25.offset;
			} catch (err) {
				if (irData.data.pm25_raw !== undefined) {
					debug('ERROR:', err.message);
				}
			}

			resolve(items);
		} catch (err) {
			debug('ERROR:', err.message);
			reject(err);
		} 
	});
}


module.exports = {
	enrich: enrich
};
