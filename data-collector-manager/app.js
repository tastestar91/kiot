//---------------------------------------------------------
// Data-collector for KETI Big-data Cluster [Node.js]
//
// Dongwoo Kwon {dwkwon80@gmail.com}, 2019-02-08
// (last modified: 2020-04-17)
//---------------------------------------------------------

'use strict';

const debug = require('debug')('data-collector-manager:app');
const Redis = require('ioredis');
const request = require('request');

const conf = require('./conf/config').dataCollector;
const zookeeperLib = require('./control/lib-zookeeper');
const { 
	collectorMap, runCollectors, checkLiveCollectors, checkRemovedCollectors 
} = require('./control/control');

const errorCountThreshold = 3;

let zkClient, redis;

let httpOptions = {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	url: 'http://' + conf.ingressRouter.address + 
		conf.ingressRouter.apiPath.servers,
	forever: true,
	timeout: 10000,
	body: ''
};

let errorCount = 0;


// Generate the address list of Redis cluster nodes
function getRedisClusterAddressList(addressStr) {
    let addressInfo, addressList = [];
    for (let address of addressStr.split(',')) {
        addressInfo = address.trim().split(':');
        addressList.push({ port: addressInfo[1], host: addressInfo[0] });
    }
    return addressList;
}


// Main control loop
let timeoutExecution = setInterval(execute, conf.monitoringInterval);


// Monitor and execute data collectors
async function execute() {
	debug('Running data-collector-manager...');

	try {
		if (!zkClient || zkClient.getState().name != 'SYNC_CONNECTED') {
			if (zkClient) {
				zkClient.close();
				zkClient = null;
			}

			zkClient = 
				await zookeeperLib.connectZookeeper(conf.zookeeper.quorum);
			await zookeeperLib.createNode(
				zkClient, conf.zookeeper.collectorInfoPath, false);

			if (collectorMap) {
				for (let collector of collectorMap.values()) {
					if (collector) {
						try {
							await zookeeperLib.createNode(
								zkClient, collector.znode, true);
						} catch (err) {
							debug('ERROR:', err);
						}
					}
				}
			}
		}
	} catch (err) {
		debug('ERROR:', err);
	}

	try {
		if (!redis || redis.status != 'ready') {
			if (redis) {
				redis.disconnect();
				redis = null;
			}

			redis = new Redis.Cluster(
				getRedisClusterAddressList(conf.redis.address[0]),
				{ redisOptions: { password: conf.redis.password } }
			);

			redis.subscribe(conf.redis.dataPostReqChannel, (err, count) => {
				debug('Started to subscribe the Redis channel:', 
					conf.redis.dataPostReqChannel);
			});
			redis.on('message', sendDataToIngressRouter);
		}
	} catch (err) {
		debug('ERROR:', err);
	}

	try {
		let modules = await checkRemovedCollectors(zkClient);
		let runningModules = await runCollectors(modules, zkClient);
		let liveModules = await checkLiveCollectors(zkClient);

		// debug('[CollectorMap (%d)]: %o', collectorMap.size, collectorMap);

		debug('[Live/Executed/Total]: %d/%d/%d', 
			liveModules ? liveModules.length : -1, 
			runningModules.length, modules.length);

		if (liveModules) {
			errorCount = 0;
		} else {
			++errorCount;
			throw new Error('Error count = ' + String(errorCount));
		}
	} catch (err) {
		debug('ERROR:', err);
		if (errorCount >= errorCountThreshold) {
			debug('ERROR: Stopped the data-collector-manager: ERR(%d/%d)',
				errorCount, errorCountThreshold);
			process.exit(1);
		}
	}
};


// Send received data from a Redis channel to ingress-router
function sendDataToIngressRouter(channel, message) {
	try {
		// debug('Redis channel: %s, message: %s', channel, message);
		httpOptions.body = message;
		// data-collector-magner channel 값으로 redis에서 subscribe
		// redis에서 구독돼엇다면 ingress-router로 post
		request(httpOptions, (error, response, body) => {
			if (!error && response && ~~(response.statusCode / 100) == 2) {
				// debug('SUCCESS: Sent data <%s> to ingress-router <%s>', 
				// 	channel, conf.ingressRouter.apiPath.servers);
			} else {
				let code = -1;
				if (response) {
					code = response.statusCode;
				}
				debug('ERROR: sendDataToIngressRouter: RESP: %d, Error: %s',
					code, error);
			}
		});
	} catch (err) {
		debug('ERROR:', err);
	}
}	


process.on('unhandledRejection', (reason, p) => {
	debug('ERROR: UNHANDLED REJECTION at Promise: %O, Reason: %s, Stack: %s', 
		p, reason, reason.stack);
});


process.on('uncaughtException', (err) => {
	debug('ERROR: UNCAUGHT EXCEPTION:', err);
});


// Termination process
['exit', 'SIGINT', 'SIGTERM', 'SIGQUIT']
	.forEach(signal => process.on(signal, () => {
		debug('Exited: %s', signal);

		if (timeoutExecution) {
			clearTimeout(timeoutExecution);
			timeoutExecution = null;
		}

		if (collectorMap) {
			for (let collector of collectorMap.values()) {
				if (collector) {
					try {
						collector.process.kill('SIGTERM');
					} catch (err) {
						debug('ERROR:', err);
					}
				}
			}
			collectorMap.clear();
		}

		if (zkClient) {
			try {
				zkClient.close();
				zkClient = null;
			} catch (err) {
				debug('ERROR:', err);
			}
		}

		if (redis) {
			try {
				redis.disconnect();
				redis = null;
			} catch (err) {
				debug('ERROR:', err);
			}
		}

		process.exit();
	}));
