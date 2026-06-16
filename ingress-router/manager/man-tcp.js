'use strict';

const debug = require('debug')('ingress-router:manager:man-tcp');
const net = require('net');

const moduleManager = require('./module-manager');

const tcpServerMap = new Map();

const tcpConnectionTimeout = 5000;

const defaultTcpSocketOptions = {
	timeout: 120000,
	keepAliveEnable: false,
	keepAliveInitialDelay: 0,
	noDelay: false
};

moduleManager.registerModuleReleaseHandler(release);


// Connect to a TCP server
function connect(address) {
	return new Promise((resolve, reject) => {
		let rejectTimeoutHandle;

		try {
			// If there exists a valid connection, return the connection
			let socket = tcpServerMap.get(address);
			if (socket) {
				resolve(socket);
				return;
			}

			// If there exists no valid connection, create a new connection
			rejectTimeoutHandle = moduleManager.enableRejectTimeout(
				reject, tcpConnectionTimeout, new Error('Connection timeout'));

			socket = new net.Socket();
			socket.setTimeout(defaultTcpSocketOptions.timeout);
			socket.setKeepAlive(defaultTcpSocketOptions.keepAliveEnable, 
				defaultTcpSocketOptions.keepAliveInitialDelay);
			socket.setNoDelay(defaultTcpSocketOptions.noDelay);
			socket.setEncoding('utf8');

			socket.on('end', () => {
				tcpServerMap.set(address, null);
				socket.end();
			});

			socket.on('timeout', () => {
				tcpServerMap.set(address, null);
				debug('ERROR: [TCPSRV/TIMEOUT]: %s', address);
				socket.end();
			});

			socket.on('error', (error) => {
				tcpServerMap.set(address, null);
				debug('ERROR: [TCPSRV/ERROR]: %s: %s', address, error);
				socket.destroy();
			});

			socket.on('data', (data) => {
				debug('INFO: [TCPSRV/RECV]: %s: %o', address, data);
			});

			let addressInfo = address.split(':');
			socket.connect(Number(addressInfo[1]), addressInfo[0], () => {
				clearTimeout(rejectTimeoutHandle);

				let sock = tcpServerMap.get(address);
				if (sock) {
					resolve(sock);
					socket.end();
				} else {
					tcpServerMap.set(address, socket);
					resolve(socket);
					debug('Connected to a TCP server: %s', address);
				}
			});
		} catch (err) {
			if (rejectTimeoutHandle) clearTimeout(rejectTimeoutHandle);
			debug('ERROR:', err);
			reject(err);
		}
	});
}


// Release all resources
function release() {
	for (let socket of tcpServerMap.values()) {
		if (socket) {
			try {
				socket.end();
			} catch (err) {
				debug('ERROR:', err);
				socket.destroy();
			}
		}
	}
}


// Send data to a TCP server
function send(address, data) {
	return new Promise(async (resolve, reject) => {
		try { 
			let socket = await connect(address);

			socket.write(data, () => {
				try {
					debug('SUCCESS: [TCPSRV/SEND]:', address);
					resolve(address);
				} catch (err) {
					debug('ERROR: [TCPSRV/SEND]: %s: %s', address, err);
					reject(err);
				}
			});
		} catch (err) {
			debug('ERROR: [TCPSRV/SEND]: %s: %s', address, err);
			reject(err);
		}
	});
}


module.exports = {
	send: send
}
