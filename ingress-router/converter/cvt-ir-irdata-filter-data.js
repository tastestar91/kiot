'use strict';

const debug =
	require('debug')('ingress-router:converter:cvt-ir-irdata-filter-data');


// Only pass the object key Data of Ingress-router data (irData) 
function convert(irData, toData, toConf) {
	return new Promise((resolve, reject) => {
		try {
			resolve(irData.data);
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
