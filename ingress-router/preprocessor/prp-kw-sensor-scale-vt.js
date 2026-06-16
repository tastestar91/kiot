'use strict';

const debug = 
	require('debug')('ingress-router:preprocessor:prp-kw-sensor-scale-vt');


// K-Weather sensor data scaling version test - kw-bstp1 테스트
function preprocess(irData) {
	return new Promise((resolve, reject) => {
		try {
			if (!irData.data.serial) {
				throw new Error(irData.service.id + ': No serial number');
			}

			irData.service.deviceId = irData.data.serial;
			irData.data.serial = undefined;

			if ((irData.service.deviceId).match(/^[a-zA-Z0-9-_]/g)) {
				delete irData.service.deviceId;
			}

			let orgValue;

			for (let sensor in irData.data) {
				if (irData.data[sensor] === undefined) continue;

				if (irData.data[sensor] === '') {
					irData.data[sensor] = undefined;
					continue;
				}

				orgValue = irData.data[sensor];

				try {
					switch (sensor) {
						case 'ch1_current':
						case 'ch2_current':
							irData.data[sensor] /= 100;
							break;

						case 'ch1_power':
						case 'ch2_power':
							irData.data[sensor] /= 1;
							break;

						case 'ch1_sum':
						case 'ch2_sum':
							irData.data[sensor] /= 10;
							break;

						default:
							irData.data[sensor] = Number(irData.data[sensor]);
							break;
					}

					if (Number.isNaN(irData.data[sensor])) {
						irData.data[sensor] = undefined;
						throw new TypeError('Invalid data value');
					}
				} catch (err) {
					debug('ERROR: %s: %s = %s', err.message, sensor, orgValue);
				}
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
