'use strict';

const debug = require('debug')
	('ingress-router:preprocessor:prp-kw-oaq-ctl-kiot-plain-v1.js');

const sensorFields = [ 'firmversion', 'starttime', 'imei', 'ctn' ];

const fieldDelimiter = '&';


// Process K-Weather OAQ plain control data version 1
function preprocess(irData) {
	return new Promise((resolve, reject) => {
		try {
			irData.service.timestamp = ~~(irData.service.timestamp / 60) * 60;

			let dataList = irData.service.apiUrlQuery.split(fieldDelimiter);
			irData.service.deviceId = dataList[0];

			let valueIndex = 3, data = {
				serial: dataList[0],
				tm: dataList[1],
				servertime: irData.service.timestamp,
			}; 

			for (let i = 0; i < dataList[2].length; ++i) {
				if (dataList[2][i] === '1') {
					data[sensorFields[i]] = dataList[valueIndex++];
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
