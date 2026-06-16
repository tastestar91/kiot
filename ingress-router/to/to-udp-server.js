'use strict';

const debug = require('debug')('ingress-router:to:to-udp-server');
const udp = require('dgram').createSocket('udp4');


udp.on('message', (msg, rinfo) => {
	debug('INFO: [UDPSRV/RECV]: %s:%d: %o', rinfo.address, rinfo.port, msg);
});


// Forward data to a UDP server
function forward(irData, toData, address, toConf) {
	return new Promise((resolve, reject) => {
		try {
			if (typeof toData !== 'string') {
				toData = JSON.stringify(toData);
			}

			let addressInfo = address.split(':');
			udp.send(toData, Number(addressInfo[1]), addressInfo[0], 
				(err) => {
					if (err) {
						debug('ERROR: [UDPSRV/SEND]: %s: %s', address, err);
						reject(err);
						return;
					}

					debug('SUCCESS: [UDPSRV/SEND]:', address);
					resolve();
				}
			);
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
		}
	});
}


module.exports = {
	forward: forward
};
