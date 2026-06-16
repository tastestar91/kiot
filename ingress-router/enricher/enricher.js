'use strict';

const debug = require('debug')('ingress-router:enricher:enricher');

const { loadModules } = require('../manager/module-manager');
const redis = require('../manager/man-redis');
const confIr = require('../conf/config').ingressRouter;


// Load enricher modules
let enricherMap;

loadModules('./enricher', 'enr-').then((moduleMap) => {
    enricherMap = moduleMap;
}).catch((err) => {
    debug("ERROR:", err);
});


function enrich(irData, enricherReqs) {
	return new Promise(async (resolve, reject) => {
		try {
			if (!enricherReqs) {
				resolve(irData);
				return;
			}

			if (!Array.isArray(enricherReqs)) {
				enricherReqs = [ enricherReqs ];
			}

			let enricher, offloadingChannelList = [];
			for (let i = 0; i < enricherReqs.length; ++i) {
				try {
					enricher = enricherMap.get(enricherReqs[i]);
					if (typeof enricher.enrich === 'function') {
						// If there exists an 'enrich' function,
						// the task is done in the inline enricher.
						Object.assign(
							irData.data, await enricher.enrich(irData));
					} else {
						// Otherwise, the task will be offloaded 
						// to the external enricher via the Redis channel.
						offloadingChannelList.push(
							confIr.redis.enricherChannel.get + enricherReqs[i]
						);
					}
				} catch (err) {
					debug('ERROR: %s: %s', enricherReqs[i], err.message);
					irData.log.push(enricherReqs[i] + ': ' + err.message);
				}
			}

			if (offloadingChannelList.length !== 0) {
				redis.publish(confIr.redis.address, offloadingChannelList,
					JSON.stringify(irData), confIr.redis.password).catch(
					(err) => {
						debug('ERROR: [Redis/PUB] External enrichers: %o',
							offloadingChannelList);
						irData.log.push(offloadingChannelList + ': ' +
							err.message);
					}
				);
			}

			resolve(irData);
		} catch (err) {
			debug('ERROR:', err.message);
			resolve(irData);		// Ignore an error
			irData.log.push(err.message);
		}
	});
}


module.exports = {
	enrich: enrich
};
