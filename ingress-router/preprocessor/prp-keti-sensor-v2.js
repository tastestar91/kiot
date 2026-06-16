'use strict';

const debug = 
	require('debug')('ingress-router:preprocessor:prp-keti-sensor-v2-adj');


// KETI sensor data adjustment (HW: v2)
function preprocess(irData) {
	return new Promise((resolve, reject) => {
		try {
		    irData.service.deviceId = 
				'floe' + irData.data.node_info[1].info.mac.substring(12, 17)
					.replace(':', '').toUpperCase();

			if (irData.data.sensors.co2 !== undefined &&
				irData.data.sensors.co2.value > 5000) {
				delete irData.data.sensors.co2;
			}
			
			resolve(irData);
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
		} 
	});
}


module.exports = {
	preprocess: preprocess
};
