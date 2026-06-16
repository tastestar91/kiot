'use strict';

const debug = require('debug')('data-collector-manager:lib-zookeeper');
const zookeeper = require('node-zookeeper-client');

const conf = require('../conf/config').dataCollector;


// List child nodes under a specific path
function listChildren(zkClient, path) {
	return new Promise((resolve, reject) => {
		try {
			zkClient.getChildren(
				path,
				(event) => {
					debug('Got watcher event:', event);
					listChildren(zkClient, path);
				},
				(error, children, stat) => {
					if (error) {
						debug('Failed to list children of %s: %s',
							path, error);
						reject(null);
						return;
					}

					if (!children || children.length === 0) {
						debug('%s has no nodes', path);
						reject(null);
						return;
					}

					debug('Children of %s = %s', path, children); 
					resolve(children);	
				}
			);
		} catch (err) {
			debug('ERROR:', err);
			reject(null);
			return;
		}
	});
}


// Set data to a node
function setData(zkClient, node, data) {
	return new Promise((resolve, reject) => {
		try {
			zkClient.exists(node, (error, stat) => {
				try {
					if (error) {
						debug('ERROR:', error.stack);
						reject(error.stack);
						return;
					}

					if (stat) {
						zkClient.setData(node, new Buffer(data),
							(error, stat) => {
							if (error) {
								debug('ERROR:', error.stack);
								reject(error.stack);
								return;
							}
							resolve(node);
						});
					} else {
						zkClient.mkdirp(node, new Buffer(data), 
							(error, path) => {
							if (error) {
								debug('ERROR:', error.stack);
								reject(error.stack);
								return;
							}
							resolve(path);
						});
					}
				} catch (err) {
					debug('ERROR:', err);
					reject(err);
					return;
				}
			});
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
			return;
		}
	});
}


// Connect ZooKeeper quorum and get node names under a specific path 
function getNodeNames(quorum, path) {
	return new Promise((resolve, reject) => {
		try {
			debug('quorum =', quorum.toString());
			debug('path =', path);

			const zkClient = zookeeper.createClient(quorum.toString());

			zkClient.once('connected', () => {
				debug('Connected to ZooKeeper:', quorum);
				listChildren(zkClient, path)
					.then((children) => {
						resolve(children);
						zkClient.close();
						return;
					})
					.catch((err) => {
						debug('ERROR:', err);
						reject(err);
						zkClient.close();
						return;
					});
			});

			zkClient.connect();
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
			return;
		}
	});
}


// Connect to ZooKeeper quorum
function connectZookeeper(quorum) {
	return new Promise((resolve, reject) => {
		try {
			debug('quorum =', quorum.toString());

			const zkClient = zookeeper.createClient(quorum.toString());

			zkClient.once('connected', () => {
				debug('Connected to ZooKeeper:', quorum);
				resolve(zkClient);
			});

			zkClient.connect();
		} catch (err) {
			debug('ERROR:', err);
			reject(null);
			return;
		}
	});
}


// Create a new node
function createNode(zkClient, node, ephemeral) {
	return new Promise((resolve, reject) => {
		try {
			zkClient.exists(node, (error, stat) => {
				try {
					if (error) {
						debug('ERROR:', error.stack);
						reject(error.stack);
						return;
					}

					if (!stat) {
						let mode;

						if (ephemeral) {
							mode = zookeeper.CreateMode.EPHEMERAL;
						} else {
							mode = zookeeper.CreateMode.PERSISTENT;
						}

						zkClient.mkdirp(node, new Buffer(node), mode,
							(error, path) => {
							if (error) {
								debug('ERROR:', error.stack);
								reject(error.stack);
								return;
							}
							resolve(path);
						});
					} else {
						resolve(node);
					}
				} catch (err) {
					debug('ERROR:', err);
					reject(err);
					return;
				}
			});
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
			return;
		}
	});
}


// Delete a node
function deleteNode(zkClient, node) {
	return new Promise((resolve, reject) => {
		try {
			zkClient.exists(node, (error, stat) => {
				try {
					if (stat) {
						zkClient.remove(node, (error) => {
							if (error) {
								debug('ERROR:', error);
								reject(error);
								return;
							}

							resolve(node);
						});
					} else {
						resolve(node);
					}
				} catch (err) {
					debug('ERROR:', err);
					reject(err);
					return;
				}
			});
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
			return;
		}
	});
}


// Get a children list under the nodes of the specific path 
function getNodeList(zkClient, path) {
	return new Promise((resolve, reject) => {
		try {
			let nodeList;

			if (!path) {
				reject(null);
				return;
			}

			listChildren(zkClient, path)
				.then((children) => {
					let znodePromises = children.map((znode) => {
						return listChildren(zkClient, path + '/' + znode)
							.then((children) => {
								return { name: znode, children: children };
							})
							.catch((err) => {
								return null;
							});
					});

					Promise.all(znodePromises).then((znodeInfo) => {
						nodeList = znodeInfo.filter((znode) => {
							return znode;
						});
						
						debug('nodeList in znode %s: %O', path, nodeList);
						resolve(nodeList);
					});
				})
				.catch((err) => {
					reject(null);
					return;
				});
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
			return;
		}
	});
}


module.exports = {
	connectZookeeper: connectZookeeper,
	createNode: createNode,
	deleteNode: deleteNode,
	getNodeList: getNodeList
};
