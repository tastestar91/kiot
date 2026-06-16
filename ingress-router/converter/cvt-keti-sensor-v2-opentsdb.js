'use strict';

const debug = 
	require('debug')('ingress-router:converter:cvt-keti-sensor-v2-opentsdb');

const nodeSensors = [ 'cpu_1m', 'cpu_5m', 'cpu_15m', 'cpu_temp' ];


// Convert KETI sensor (HW: v1/v2) data to the OpenTSDB JSON API format
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
			for (let sensor in irData.data.sensors) {
				try {
					toData.push({
						timestamp: irData.data.sensors[sensor].time,
						value: irData.data.sensors[sensor].value,
						metric: metric,
						tags: Object.assign(
							{
								mac: irData.service.deviceId,
								sensor: sensor
							},
							irData.service.defaultTags
						)
					});
				} catch (err) {
					debug('ERROR: %s: %s: %s', irData.service.id,
						irData.service.deviceId, err.message);
				}
			}

			// Node data (e.g. CPU temperature and utilization)
			for (let i = 0; i < nodeSensors.length; ++i) {
				try {
					toData.push({
						timestamp: toData[0].timestamp,
						value: irData.data.node_info[1].info[nodeSensors[i]],
						metric: metric,
						tags: Object.assign(
							{
								mac: irData.service.deviceId,
								sensor: nodeSensors[i]
							},
							irData.service.defaultTags
						)
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
