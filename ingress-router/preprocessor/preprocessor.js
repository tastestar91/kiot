'use strict';

const debug = require('debug')('ingress-router:preprocessor:preprocessor');
const _ = require('lodash');

const { loadModules } = require('../manager/module-manager');


// Load preprocessor modules
let preprocessorMap;

loadModules('./preprocessor', 'prp-').then((moduleMap) => {
    preprocessorMap = moduleMap;
}).catch((err) => {
    debug("ERROR:", err);
});


function preprocess(irData, preprocessorReqs) {
	return new Promise(async (resolve, reject) => {
		try {
			irData.data = _.cloneDeep(irData.request);
			
			if (!preprocessorReqs) {
				resolve(irData);
				return;
			}

			if (!Array.isArray(preprocessorReqs)) {
				preprocessorReqs = [ preprocessorReqs ];
			}

			for (let i = 0; i < preprocessorReqs.length; ++i) {
				irData = await preprocessorMap.get(preprocessorReqs[i])
					.preprocess(irData);
			}

			resolve(irData);
		} catch (err) {
			debug('ERROR:', err.message);
			reject(new Error(400));
			irData.log.push(err.message);
		}
	});
}


module.exports = {
	preprocess: preprocess
};
