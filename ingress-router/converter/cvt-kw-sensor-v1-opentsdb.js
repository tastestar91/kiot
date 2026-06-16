'use strict';

const debug = 
	require('debug')('ingress-router:converter:cvt-kw-sensor-v1-opentsdb');


// Convert K-Weather sensor data to the OpenTSDB JSON API format
function convert(irData, toData, toConf) {
	return new Promise((resolve, reject) => {
		try {
			let metric;
			if (toConf.metric) {
				metric = toConf.metric;
			} else {
				metric = irData.service.id;
			}

			toData = [];

			// Sensor data (e.g. temperature, CO2, and PM)
			for (let sensor in irData.data) {
				if (irData.data[sensor] === undefined) continue;

				try {
					// !hansu.chung: metric: kw-iaq-sensor-kiot
					toData.push({
						timestamp: irData.service.timestamp,
						value: irData.data[sensor],
						metric: metric,
						tags: {
							serial: irData.service.deviceId,
							sensor: sensor
						}
					});

					// !hansu.chung: metric: kw-iaq-sensor-kiot.ISC0W2000009
					toData.push({
						timestamp: irData.service.timestamp,
						value: irData.data[sensor],
						metric: metric + '.' + irData.service.deviceId,
						tags: {
							sensor: sensor
						}
					});

					/*
					toData.push({
						timestamp: irData.service.timestamp,
						value: irData.data[sensor],
						metric: metric + '.' + irData.service.deviceId + 
							'.' + sensor,
						tags: {
							admin: 'kweather'
						}
					});
					*/
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
