'use strict';

const debug = 
	require('debug')('ingress-router:postprocessor:psp-kw-ctl-v1-1-response');
const memStoreRedis = require('../manager/man-memstore-redis');
const redis = require('../manager/man-redis');

const confIr = require('../conf/config').ingressRouter;

const keyPrefix = 'kw/ctl/fota/v1/';


// K-Weather control data response
function postprocess(irData) {
	return new Promise(async (resolve, reject) => {
		try {
			let result, reset, update;

			if (irData.error) result = 'getDATA1';
			else result = 'getDATA0';

			let data =
				await memStoreRedis.get(keyPrefix + irData.service.deviceId);

			if (data) {
				if (data.reset) reset = 'RESET' + data.reset;
				else reset = 'RESET0';

				if (data.fota && irData.data.firmversion && data.firmversion &&
					(irData.data.firmversion !== data.firmversion)) {
					update = 'FW' + data.fota + '=' + data.firmversion;
				} else {
					update = 'FW0';
				}
			} else {
				reset = 'RESET0';
				update = 'FW0';
			}

			let datetime =
				new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
					.toISOString().slice(0, 19).replace(/-|:|T/g, '');

			irData.response = {
				statusCode: 200,
				message: `<r>${result}</r><b>${reset}</b><f>${update}</f><t>${datetime}</t>`
			};

			if (data && (data.reset || data.fota)) {
				data.reset = data.fota = 0;
				await memStoreRedis.set(
					keyPrefix + irData.service.deviceId, data);
				await redis.publish(
					confIr.redis.address,
					confIr.redis.memStoreChannel.put + keyPrefix +
						irData.service.deviceId,
					JSON.stringify(data),
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
