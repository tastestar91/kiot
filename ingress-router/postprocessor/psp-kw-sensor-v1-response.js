'use strict';

const debug = 
	require('debug')('ingress-router:postprocessor:psp-kw-sensor-v1-response');


// K-Weather sensor data response
function postprocess(irData) {
	return new Promise((resolve, reject) => {
		try {
			irData.response = {
				statusCode: 200,
				message: irData.error ?
					'<kweather_iot><result>getDATA1</result></kweather_iot>' :
					'<kweather_iot><result>getDATA0</result></kweather_iot>'
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
