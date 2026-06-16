'use strict';

const debug = require('debug')('ingress-router:monitor:mon-kw-sensor-v1-zk');

const zookeeper = require('../manager/man-zk');
const confIr = require('../conf/config').ingressRouter;

const sensorInfoPath = confIr.zookeeper.monitorPath.sensors + '/kw/';


// Update K-Weather sensor data to ZooKeeper znodes
function monitor(irData) {
	try {
		zookeeper.setZnodeData(
			confIr.zookeeper.quorum,
			sensorInfoPath + irData.service.id + '/' + irData.service.deviceId,
			JSON.stringify(irData)
		).then((path) => {
			debug('SUCCESS: [ZK/UPDATE]: %s', path);
		}).catch((err) => {
			debug('ERROR: [ZK/UPDATE]: %s: %s', nodePath, err);
		});
	} catch (err) {
		debug('ERROR:', err);
	}
}


module.exports = {
	monitor: monitor
}
