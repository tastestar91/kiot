'use strict';

const debug = require('debug')
	('ingress-router:preprocessor:prp-kw-oaq-sensor-oot-plain-v1');

const sensorFields = [
	'serial', 'timestamp', 'tm',
    'no', 'no2', 'nox', 'tsp', 
	'pm01_raw', 'pm25_raw', 'pm10_raw', 'temp', 'humi','gps_lat', 'gps_lon'
];

const fieldDelimiter = '&';


// Process K-Weather OAQ plain sensor data version 1
function preprocess(irData) {
	return new Promise((resolve, reject) => {
		try {
			let dataList = irData.service.apiUrlQuery.split(fieldDelimiter);
			irData.service.deviceId = dataList[0];
			irData.service.timestamp = Number(dataList[1]);

			let data = {};
			for (let i = 2; i < dataList.length; ++i) {
				if (dataList[i] !== '-999') data[sensorFields[i]] = Number(dataList[i]);
			}

			if (data.pm01_raw !== undefined) {
				data.pm01 = data.pm01_raw;
			}
			if (data.pm25_raw !== undefined) {
				data.pm25 = data.pm25_raw;
			}
			if (data.pm10_raw !== undefined) {
				data.pm10 = data.pm10_raw;
			}

			irData.data = data;
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
