'use strict';

const debug = require('debug')
	('ingress-router:converter:cvt-kw-sensor-v1-opentsdb-tsmeta');


// Convert K-Weather sensor control data to the OpenTSDB JSON API format
function convert(irData, toData, toConf) {
	return new Promise((resolve, reject) => {
		try {
			let metric;
			if (toConf.metric) {
				metric = toConf.metric;
			} else {
				metric = irData.service.id;
			}

			irData.service.metricTags = 
				metric + '{serial=' + irData.service.deviceId + '}';

			resolve({ custom: irData.data });
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
