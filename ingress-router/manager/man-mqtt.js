'use strict';

const debug = require('debug')('ingress-router:manager:man-mqtt');
const mqtt = require('mqtt');

const moduleManager = require('./module-manager');

const mqttPubServerMap = new Map();
const mqttSubServerMap = new Map();

const defaultMqttOptions = {
	clean: true,
	keepalive: 60,
	reconnectPeriod: 5000,
	connectTimeout: 5000,
	queueQoSZero: true,
	resubscribe: true
};

const defaultMqttPubOptions = {
	qos: 0,
	retain: false,
	cbStorePut: undefined
};

moduleManager.registerModuleReleaseHandler(release);


// Connect a MQTT broker
function connect(address, serverMap, /* [optional] */ username, password) {
	return new Promise((resolve, reject) => {
		try {
			// If there exists a valid connection, return the connection
			let client = serverMap.get(address);
			if (client && (client.connected || client.reconnecting)) {
				resolve(client);
				return;
			}

			// If there exists no valid connection, create a new connection
			if (client) {
				serverMap.set(address, null);
				client.end();
			}

			if (password) {
				let mqttOptions = defaultMqttOptions;
				mqttOptions.username = username;
				mqttOptions.password = password;
				client = mqtt.connect('mqtt://' + address, mqttOptions);
			} else {
				client = mqtt.connect('mqtt://' + address, defaultMqttOptions);
			}

			client.on('reconnect', () => {
				serverMap.set(address, client);
				debug('INFO: [MQTT/RECONNECT]: %o (conn=%o/reconn=%o)',
					address, client.connected, client.reconnecting);
			});
			
			client.on('close', () => {
				debug('INFO: [MQTT/CLOSE]: %o (conn=%o/reconn=%o)',
					address, client.connected, client.reconnecting);
			});

			client.on('offline', () => {
				debug('ERROR: [MQTT/OFFLINE]: %o (conn=%o/reconn=%o)',
					address, client.connected, client.reconnecting);
			});

			client.on('error', () => {
				debug('ERROR: [MQTT/ERROR]: %o (conn=%o/reconn=%o)',
					address, client.connected, client.reconnecting);
			});

			client.on('connect', () => {
				let mq = serverMap.get(address);
				if (mq && mq.connected) {
					resolve(mq);
					client.end();
				} else {
					serverMap.set(address, client);
					resolve(client);
					debug('Connected to MQTT broker: %o (conn=%o/reconn=%o)', 
						address, client.connected, client.reconnecting);
					if (mq) mq.end();
				}
			});
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
		}
	});
}


// Release all resources
function release() {
	for (let serverMap of [mqttPubServerMap, mqttSubServerMap]) {
		for (let client of serverMap.values()) {
			if (client) {
				try {
					client.end();
				} catch (err) {
					debug('ERROR:', err);
				}
			}
		}
		serverMap.clear();
	}
} 


// Publish data to a MQTT topic
function publish(address, topic, data, /* [optional] */ username, password) {
	return new Promise(async (resolve, reject) => {
		try {
			let client = 
				await connect(address, mqttPubServerMap, username, password);

			if (!Array.isArray(topic)) {
				topic = [ topic ];
			}

			for (let index = 0; index < topic.length; ++index) {
				client.publish(topic[index], data, defaultMqttPubOptions, 
					(err) => {
						if (err) {
							debug('ERROR: [MQTT/PUB]: %s: %s: %s', 
								address, topic[index], err);
							if (index === 0) reject(err);
						} else {
							debug('SUCCESS: [MQTT/PUB]: %s: %s',
								address, topic[index]);
							if (index === 0) resolve(address);
						}
					}
				);
			}
		} catch (err) {
			debug('ERROR: [MQTT/PUB]: %s: %s: %s', address, topic, err);
			reject(err);
		}
	});
}


module.exports = {
	publish: publish,
};
