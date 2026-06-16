'use strict';

const debug = require('debug')('ingress-router:converter:converter');
const { loadModules } = require('../manager/module-manager');


// Load converter modules
let converterMap;

loadModules('./converter', 'cvt-').then((moduleMap) => {
    converterMap = moduleMap;
}).catch((err) => {
    debug("ERROR:", err);
});


function convert(irData, toConf) {
	return new Promise(async (resolve, reject) => {
		try {
			if (!toConf.converter) {
				resolve(irData);
				return;
			}

			if (!Array.isArray(toConf.converter)) {
				toConf.converter = [ toConf.converter ];
			}

			let toData;
			for (let i = 0; i < toConf.converter.length; ++i) {
				toData = await converterMap.get(toConf.converter[i])
					.convert(irData, toData, toConf);
				if (toData) break;
			}

			resolve(toData);
		} catch (err) {
			debug('ERROR:', err.message);
			reject(new Error(400));
			irData.log.push(err.message);
		}
	});
}


module.exports = {
	convert: convert
};
