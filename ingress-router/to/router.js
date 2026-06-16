'use strict';

const debug = require('debug')('ingress-router:to:router');
const fs = require('fs');
const path = require('path');

const { loadModules } = require('../manager/module-manager');
const zookeeper = require('../manager/man-zk');
const converter = require('../converter/converter');
const confIr = require('../conf/config').ingressRouter;

// Load balancing: round robin index map
const rrIndexMap = new Map();


// Load TO modules
let toMap;

loadModules('./to', 'to-').then((moduleMap) => {
	toMap = moduleMap;
}).catch((err) => {
	debug("ERROR:", err);
});

// Configuration information tables
let infoTables = {
	routingConf: {
		file: '../conf/routing-conf.js',
		modifiedTime: 0,
		contents: require('../conf/routing-conf')
	},
	serverConf: {
		file: '../conf/server-conf.js',
		modifiedTime: 0,
		contents: require('../conf/server-conf'),
		relatedTableList: [ 'routingConf' ]
	}
};

setInterval(checkInfoTables, confIr.infoTableMonitorInterval);


// Check the changes of configuration files in information tables
function checkInfoTables() {
	try {
		for (let id in infoTables) {
			fs.stat(path.join(__dirname, infoTables[id].file), 
				(err, stats) => {
				try {
					if (err) {
						throw new Error(err);
					}

					if (stats.mtimeMs !== infoTables[id].modifiedTime) {
						refreshInfoTable(id, stats.mtimeMs);
					}
				} catch (error) {
					debug('ERROR:', error);
				}
			});
		}
	} catch (err) {
		debug('ERROR:', err);
	}
}


// Refresh configuration information tables
function refreshInfoTable(tid, mtime) {
	try {
		let targetTableList = [ tid ];
		if (infoTables[tid].relatedTableList) {
			targetTableList =
				targetTableList.concat(infoTables[tid].relatedTableList);
		}

		let newTable, prevTable;
		for (let id of targetTableList) {
			try {
				newTable = prevTable = infoTables[id];

				delete require.cache[require.resolve(newTable.file)];
				newTable.contents = require(newTable.file);

				if (id === tid) {
					newTable.modifiedTime = mtime;
					infoTables[id] = newTable;
				}
				prevTable = null;

				debug('Reloaded the information table %s: %s', 
					id, newTable.file);
			} catch (err) {
				debug('ERROR:', err);
				if (prevTable) {
					infoTables[id] = prevTable;
				}
			}
		}
	} catch (err) {
		debug('ERROR:', err);
	}
}


// Get routing configurations from a routing table
function getRoutingConf(service) {
	return new Promise((resolve, reject) => {
		try {
			let routingConf;

			if (service.route) {
				routingConf = service.route;
			} else {
				for (let conf of 
					infoTables.routingConf.contents.routingTable.confs) {
					if (!Array.isArray(conf.id)) conf.id = [ conf.id ];

					if (conf.id.indexOf(service.id) > -1) {
						routingConf = conf;
						break;
					}
				}

				if (!routingConf) {
					throw new Error('No routing configuration: ' + service.id);
				}
			}

			if (!Array.isArray(routingConf.to)) {
				routingConf.to = [ routingConf.to ];
			}

			resolve(routingConf);
		} catch (err) {
			debug('ERROR:', err.message);
			reject(new Error(400));
		}
	});
}


// Routing function
function route(irData, toConfs) {
	return new Promise((resolve, reject) => {
		try {
			if (!toConfs || toConfs.length === 0) {
				throw new Error('No TO information: ' + irData.service.id);
			}

			for (let index = 0; index < toConfs.length; ++index) {
				getForwardingAddress(toConfs[index].forwarding)
					.then(async (address) => {
						let toData =
							await converter.convert(irData, toConfs[index]);
						if (toData) {
							await toMap.get(toConfs[index].type).forward(
								irData, toData, address, toConfs[index]);
						}
					})
					.then(() => {
						if (index === 0) resolve(irData);
					})
					.catch((err) => {
						debug('ERROR: %s: %s', toConfs[index].type,
							err.message);
						if (index === 0) reject(new Error(400));
						irData.log.push(toConfs[index].type + ': ' + 
							err.message);
					});
			}
		} catch (err) {
			debug('ERROR:', err);
			reject(new Error(400));
			irData.log.push(err.message);
		}
	});
}


// Get a forwarding address according to a load balancing type
function getForwardingAddress(forwardingInfo) {
	return new Promise(async (resolve, reject) => {
		try {
			if (!Array.isArray(forwardingInfo.address)) {
				forwardingInfo.address = [ forwardingInfo.address ];
			}

			let forwardingAddress;
			switch (forwardingInfo.loadBalancing) {
				case 'none':
				case undefined:
					forwardingAddress = forwardingInfo.address[0];
					break;
				case 'rr':
					forwardingAddress = getRrAddress(forwardingInfo.address);
					break;
				case 'zk-rr':
					forwardingAddress = getRrAddress(
						await zookeeper.getZnodeList(
							forwardingInfo.address.toString(),
							forwardingInfo.znode)
					);
					break;
				default:
					throw new Error('Unsupported load balancing type: ' + 
						forwardingInfo.loadBalancing);
					break;
			}

			if (!forwardingAddress) {
				throw new Error(
					'Invalid forwarding address: ' + forwardingInfo.address);
			}

			resolve(forwardingAddress);
		} catch (err) {
			debug('ERROR:', err);
			reject(500);
		}
	});
}


// Load balancing type: Round Robin
function getRrAddress(addressList) {
	try {
		let index;
		for (index = 0; index < addressList.length; ++index) {
			// If addressList[index] is undefined or 0
			if (!rrIndexMap.get(addressList[index])) {
				break;
			}
		}

		// If all addressList is set to 1
		if (index === addressList.length) {
			index = 0;
		}

		rrIndexMap.set(addressList[index], 1);
		rrIndexMap.set(addressList[(index+1)%addressList.length], 0);
		return addressList[index];
	} catch (err) {
		debug('ERROR:', err);
		return null;
	}
}


module.exports = {
	getRoutingConf: getRoutingConf,
	route: route
};
