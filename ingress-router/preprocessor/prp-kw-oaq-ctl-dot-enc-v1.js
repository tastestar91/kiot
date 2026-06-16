'use strict';

const debug = 
	require('debug')('ingress-router:preprocessor:prp-kw-oaq-ctl-dot-enc-v1');
const base64 = require('64');
const sha256 = require('asmcrypto-lite').SHA256;

const sensorFields = [
	'pversion', 'tm', 'serial', 'starttime', 'firmversion', 'imei', 'ctn',
	'sensorstatus'
];

const fieldDelimiter = '&';


// Process K-Weather OAQ DOT-encoded control data version 1
function preprocess(irData) {
	return new Promise((resolve, reject) => {
		try {
			irData.service.timestamp = ~~(irData.service.timestamp / 60) * 60;
			
			// Decode data
			let dataList =
				base64.decode(Buffer.from(irData.service.apiUrlQuery))
					.toString().split(fieldDelimiter);

			// Check data integrity
			let hashValue = dataList[1] + dataList[4] + dataList[8];

			dataList.splice(1, 1);		// enc1
			dataList.splice(3, 1);		// enc2
			dataList.splice(6, 1);		// enc3

			let digest = 
				sha256.hex(dataList.join(fieldDelimiter)).toUpperCase();
			if (hashValue !== digest) {
				throw new Error('Wrong hash value: Hashed = ' + digest);
			}

			// Process data
			irData.service.deviceId = dataList[2] = dataList[2].slice(0, -10);
			dataList[0] = dataList[0].slice(4, 6);
			dataList[7] = dataList[7].slice(0, -4);

			let data = { servertime: irData.service.timestamp };
			for (let i = 0; i < dataList.length; ++i) {
				data[sensorFields[i]] = dataList[i];
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
