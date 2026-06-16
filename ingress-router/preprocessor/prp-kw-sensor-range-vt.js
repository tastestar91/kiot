'use strict';

const debug = 
	require('debug')('ingress-router:preprocessor:prp-kw-sensor-range-vt');

// K-Weather sensor data range version test
function preprocess(irData) {
	return new Promise((resolve, reject) => {
		try {
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
						case 'ch1_current': //전류 유효범위
						case 'ch2_current': //전류 유효범위
							if (irData.data[sensor] < 0) {
								delete irData.data[sensor];
							} else if (irData.data[sensor] > 99999) {
								irData.data[sensor] = 99999;
							}
							break;
						case 'ch1_power': //전력 유효범위
						case 'ch2_power': //전력 유효범위
							if (irData.data[sensor] < 0) {
								delete irData.data[sensor];
							} else if (irData.data[sensor] > 99999) {
								irData.data[sensor] = 99999;
							}
							break;
						case 'ch1_sum': //전력량 유효범위
						case 'ch2_sum': //전력량 유효범위
							if (irData.data[sensor] < 0) {
								delete irData.data[sensor];
							} else if (irData.data[sensor] > 999999) {
								irData.data[sensor] = 999999;
							}
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
