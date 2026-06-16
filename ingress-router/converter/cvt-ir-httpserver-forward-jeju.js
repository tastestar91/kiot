'use strict';

const debug =
	require('debug')('ingress-router:converter:cvt-ir-httpserver-forward-jeju');


// Create a GET query to forward the received query to another HTTP server
function convert(irData, toData, toConf) {
	return new Promise((resolve, reject) => {
		try {
			let pm10, pm25, temp, humi, atm, rain, uri;

			if (irData.data.pm10 !== undefined) pm10 = irData.data.pm10;
			else pm10 = '';

			if (irData.data.pm25 !== undefined) pm25 = irData.data.pm25;
			else pm25 = '';

			if (irData.data.temp !== undefined) temp = irData.data.temp;
			else temp = '';

			if (irData.data.humi !== undefined) humi = irData.data.humi;
			else humi = '';

			if (irData.data.atm !== undefined) atm = irData.data.atm;
			else atm = '';

			if (irData.data.rain !== undefined) rain = irData.data.rain;
			else rain = '';

			uri = 'serial=' + irData.service.deviceId +
				  '&tm=' + irData.data.tm +
				  '&pm10=' + pm10 +
				  '&pm25=' + pm25 +
				  '&temp=' + temp +
				  '&humi=' + humi +
				  '&atm=' + atm +
				  '&rain=' + rain;

			resolve({
				method: 'GET',
				uri: '?' + uri
			});
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
