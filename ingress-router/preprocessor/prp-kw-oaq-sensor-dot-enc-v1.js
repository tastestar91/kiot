'use strict';

const debug = require('debug')
	('ingress-router:preprocessor:prp-kw-oaq-sensor-dot-enc-v1');
const base64 = require('64');
const sha256 = require('asmcrypto-lite').SHA256;

const sensorFields = [
	'pm25_raw', 'pm10_raw', 'temp', 'humi', 'windd', 'winds', 'windd_max',
	'winds_max', 'lux', 'uv', 'noise', 'accx', 'accy', 'accz', 'accx_max',
	'accy_max', 'accz_max', 'wbgt', 'etc1', 'etc2', 'etc3'
];

const fieldDelimiter = '&';


// Process K-Weather OAQ DOT-encoded sensor data version 1
function preprocess(irData) {
	return new Promise((resolve, reject) => {
		try {
			irData.service.timestamp = ~~(irData.service.timestamp / 60) * 60;

			// Decode data
			let dataList = 
				base64.decode(Buffer.from(irData.service.apiUrlQuery))
					.toString().split(fieldDelimiter);

			// Check data integrity
			let hashValue = dataList[5] + dataList[10] + dataList[17];

			dataList.splice(5, 1);		// enc1
			dataList.splice(9, 1);		// enc2
			dataList.splice(15, 1);		// enc3

			let digest = 
				sha256.hex(dataList.join(fieldDelimiter)).toUpperCase();
			if (hashValue !== digest) {
				throw new Error('Wrong hash value: Hashed = ' + digest);
			}

			// Process data
			irData.service.deviceId = dataList[2].slice(0, -10);
			dataList[24] = dataList[24].slice(0, -4);

			let data = { tm: dataList[1] };
			for (let i = 3; i < 24; ++i) {
				if (dataList[24][i-3] === '1') {
					data[sensorFields[i-3]] = dataList[i];
				}
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
