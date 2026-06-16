'use strict';

const debug = require('debug')
	('ingress-router:converter:cvt-kw-sensor-v1-pub-sensor-vent');

const memStoreRedis = require('../manager/man-memstore-redis');
const confIr = require('../conf/config').ingressRouter;

const sensorChannel = confIr.redis.sensorDataChannel.get +'kw/iaq/sensor/kiot';
const iaqVentChannel = confIr.redis.sensorDataChannel.get + 'kw/iaq/vent/kiot';
const iaqVentKeyPrefix = 'kw/iaq/cmd/v1/';

// Pseudo service ID for IAQ-VENT: kw-iaq-vent-kiot-plain-v1
const iaqVentServiceId = 'kw-ivkp1';


// Generate K-Weather IAQ sensor and IAQ-VENT data list
function convert(irData, toData, toConf) {
	return new Promise(async (resolve, reject) => {
		try {
			toData = [
				{
					channel: [ sensorChannel ], 
					data: JSON.stringify(irData)
				}
			];

			try {
				let iaqData = await memStoreRedis.get(
					iaqVentKeyPrefix + irData.service.deviceId);
				if (!iaqData) {
					resolve(toData);
					return;
				}

				let data = {};
				for (let i = 0; i < iaqData.vent.length; ++i) {
					if (iaqData.vent[i].ai_mode === undefined) continue;
					
					try {
						data[iaqData.vent[i].serial] = iaqData.vent[i].ai_mode;	
					} catch (err) {
						debug('ERROR: %s: %s', irData.service.deviceId,
							err.message);
					}
				}

				toData.push({
					channel: [ iaqVentChannel ],
					data: JSON.stringify({
						// Pseudo Ingress-router data (irData) for IAQ-VENT
						service: {
							id: iaqVentServiceId,
							timestamp: irData.service.timestamp,
							deviceId: irData.service.deviceId
						},
						data: {
							sensor: irData.data,
							vent: data
						}
					})
				});
			} catch (err) {
				debug('ERROR: %s: %s', irData.service.deviceId, err.message);
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
