'use strict';

const debug = require('debug')
	('ingress-router:preprocessor:prp-kw-oaq-sensor-etc-plain-v1');


// Process K-Weather OAQ plain Etc. sensor data version 1
function preprocess(irData) {
	return new Promise((resolve, reject) => {
		try {
			if (!irData.data.serial) {
				throw new Error(irData.service.id + ': No serial number');
			}

			irData.service.deviceId = irData.data.serial;
			irData.data.serial = undefined;
	
			if (irData.data.timestamp) {
				irData.service.timestamp = Number(irData.data.timestamp);
				irData.data.timestamp = undefined;
			} else {
				irData.service.timestamp =
					~~(irData.service.timestamp / 60) * 60;
			}

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
