'use strict';

const debug = require('debug')('ingress-router:monitor:monitor');

const { loadModules } = require('../manager/module-manager');


// Load monitor modules
let monitorMap;

loadModules('./monitor', 'mon-').then((moduleMap) => {
	monitorMap = moduleMap;
}).catch((err) => {
	debug("ERROR:", err);
});


function monitor(irData, monitorReqs) {
	try {
		if (!monitorReqs) {
			return;
		}

		if (!Array.isArray(monitorReqs)) {
			monitorReqs = [ monitorReqs ];
		}

		for (let i = 0; i < monitorReqs.length; ++i) {
			try {
				monitorMap.get(monitorReqs[i]).monitor(irData);
			} catch (err) {
				debug('ERROR: %s monitor module error: %s', 
					monitorReqs[i], err);
				irData.log.push(monitorReqs[i] + ': ' + err.message);
			}
		}
	} catch (err) {
		debug('ERROR:', err);
		irData.log.push(err.message);
	}
}


module.exports = {
	monitor: monitor
};
