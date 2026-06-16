'use strict';

const debug = require('debug')('ingress-router:postprocessor:postprocessor');

const { loadModules } = require('../manager/module-manager');

const defaultSuccessResponse = { statusCode: 200 };


// Load postprocessor modules
let postprocessorMap;

loadModules('./postprocessor', 'psp-').then((moduleMap) => {
    postprocessorMap = moduleMap;
}).catch((err) => {
    debug("ERROR:", err);
});


function postprocess(irData, postprocessorReqs) {
	return new Promise(async (resolve, reject) => {
		try {
			if (!postprocessorReqs) {
				if (irData.error) {
					resolve({ statusCode: irData.error.statusCode });
				} else {
					resolve(defaultSuccessResponse);
				}
				return;
			}

			if (!Array.isArray(postprocessorReqs)) {
				postprocessorReqs = [ postprocessorReqs ];
			}

			for (let i = 0; i < postprocessorReqs.length; ++i) {
				irData = await postprocessorMap.get(postprocessorReqs[i])
					.postprocess(irData);
			}

			if (irData.response) {
				resolve(irData.response);
			} else {
				if (irData.error) {
					resolve({ statusCode: irData.error.statusCode });
				} else {
					resolve(defaultSuccessResponse);
				}
			}
		} catch (err) {
			debug('ERROR:', err.message);
			reject(new Error(500));
			irData.log.push(err.message);
		}
	});
}


module.exports = {
	postprocess: postprocess
};
