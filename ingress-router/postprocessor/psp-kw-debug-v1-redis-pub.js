'use strict';

const debug = 
	require('debug')('ingress-router:postprocessor:psp-kw-debug-v1-redis-pub');
const redis = require('../manager/man-redis');

const confIr = require('../conf/config').ingressRouter;

const channelSuccess = 
	confIr.redis.postprocessorChannel.get + 'kw/debug/response/v1/success';
const channelError =
	confIr.redis.postprocessorChannel.get + 'kw/debug/response/v1/error';


// Publish Ingress-router data (irData) to a Redis channel for debugging
function postprocess(irData) {
	return new Promise(async (resolve, reject) => {
		try {
			if (irData.error) {
				await redis.publish(
					confIr.redis.address,
					channelError,
					JSON.stringify(irData),
					confIr.redis.password
				);
			} else {
				await redis.publish(
					confIr.redis.address,
					channelSuccess,
					JSON.stringify(irData),
					confIr.redis.password
				);
			}

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
