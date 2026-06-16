'use strict';

const debug = require('debug')('ingress-router:monitor:mon-keti-sensor-v2-zk');

const zookeeper = require('../manager/man-zk');
const confIr = require('../conf/config').ingressRouter;

const sensorInfoPath = confIr.zookeeper.monitorPath.sensors + '/keti/';


// Update KETI sensor (HW: v1/v2) data to ZooKeeper znodes
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
