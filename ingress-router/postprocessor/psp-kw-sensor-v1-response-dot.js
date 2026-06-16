'use strict';

const debug = require('debug')
	('ingress-router:postprocessor:psp-kw-sensor-v1-response-dot');


// K-Weather DOT sensor data response
function postprocess(irData) {
	return new Promise((resolve, reject) => {
		try {
			let message;

			if (irData.error) {
				message = '';
			} else {
				let pm25, pm10;

				if (irData.data.pm25 !== undefined) pm25 = irData.data.pm25;
				else pm25 = '-999';

				if (irData.data.pm10 !== undefined) pm10 = irData.data.pm10;
				else pm10 = '-999';

				message = `${pm25},${pm10},${irData.service.deviceId},${irData.service.deviceId}${irData.data.tm}`;
			}

			irData.response = {
				statusCode: 200,
				message: message
			};

			resolve(irData);
		} catch (err) {
			debug('ERROR:', err.message);
			reject(err);
		} 
	});
}


module.exports = {
	postprocess: postprocess
};
