'use strict';

const debug = require('debug')
	('ingress-router:preprocessor:prp-kw-beems-sensor-test-plain-v1');


// Process K-Weather BEEMS (Test) plain sensor data version 1
function preprocess(irData) {
	return new Promise((resolve, reject) => {
		try {
			irData.service.timestamp = ~~(irData.service.timestamp / 60) * 60;
			irData.service.deviceId = irData.data.serial;
			irData.data.serial = undefined;

			resolve(irData);
		} catch (err) {
			debug('ERROR:', err.message);
			reject(err);
		} 
	});
}


module.exports = {
	preprocess: preprocess
};
