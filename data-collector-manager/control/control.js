'use strict';

const debug = require('debug')('data-collector-manager:control');

const fs = require('graceful-fs');
fs.gracefulify(require('fs'));

const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const shell = require('shelljs');

const zookeeperLib = require('./lib-zookeeper');
const conf = require('../conf/config').dataCollector;

const hostname = os.hostname();

const collectorMap = new Map();
const checkProcessCommand = 
	'ps -ef | grep -v \'ps -ef\' | awk \'{ if ($3 == ' + process.pid + 
	' && $2 == $$CPID$$) { print $2" "$3 } }\' | wc -l';
const getLiveProcessesCommand = 
	'ps -ef | grep -v \'ps -ef\' | awk \'{ if ($3 == "' + process.pid + 
	'") { print $2 } }\'';

let runningCollectors = [];


// Identify and run data collectors
async function runCollectors(modules, zkClient) {
	return new Promise(async (resolve, reject) => {
		try {
			if (modules.length === 0) {
				resolve([]);
				return;
			}

			shell.mkdir('-p', conf.logDir);

			runningCollectors = await Promise.all(modules.map(async (dir) => {
				try {
					let workingDir = path.join(conf.moduleDir, dir);

					let live = runningCollectors.find((collector) => {
						return collector === dir;
					});
					if (live) return dir;

					let files = fs.readdirSync(workingDir).filter((file) => {
						return !fs.statSync(path.join(workingDir, file))
							.isDirectory();
					});

					let command = '', args = [];
					for (let file of files) {
						// Node.js file
						if (conf.moduleLang.nodejs.mainFiles.indexOf(file) > -1 
							|| file === dir + '.js') {
							command = conf.moduleLang.nodejs.node;
							args = [file];
							break;
						// Node.js package
						/*
						} else if (file === 'package.json') {
							command = conf.moduleLang.nodejs.npm;
							args = ['start'];
							break;
						*/
						// Python2
						} else if (conf.moduleLang.python2.mainFiles
							.indexOf(file) > -1 || file === dir + '.py2') {
							command = conf.moduleLang.python2.python;
							args = ['-u', file];
							break;
						// Python3
						} else if (conf.moduleLang.python3.mainFiles
							.indexOf(file) > -1 || file === dir + '.py' || 
							file === dir + '.py3') {
							command = conf.moduleLang.python3.python;
							args = ['-u', file];
							break;
						// Linux shell script
						} else if (conf.moduleLang.shell.mainFiles
							.indexOf(file) > -1 || file === dir + '.sh') {
							command = conf.moduleLang.shell.sh;
							args = ['-c', file];
							break;
						} 
					}

					if (!command) {				
						throw new Error('No executable file in ' + workingDir);
					}

					let logFile = fs.createWriteStream(
						path.join(conf.logDir, dir) + '.log', 
						{ flags: 'a', autoClose: true });

					debug('Collector: %s %o in %s', command, args, workingDir);

					let collectorEnv = process.env;
					delete collectorEnv['NODE_ENV'];
					delete collectorEnv['DEBUG'];

					let collector = childProcess.spawn(command, args, { 
						cwd: workingDir,
						env: collectorEnv,
						detached: false,
						stdio: ['pipe', 'pipe', 'pipe']
					});

					collector.on('error', async (err) => {
						try {
							debug('ERROR:', err);
							if (collectorMap.get(collector.pid)) {
								await releaseCollector(zkClient, collector.pid);
							}
						} catch (error) {
							debug('ERROR:', error);
						}
					});

					collector.on('close', async (code, signal) => {
						try {
							debug('CLOSED: Module {%s}: %d, %s', 
								dir, code, signal);
							if (collectorMap.get(collector.pid)) {
								await releaseCollector(
									zkClient, collector.pid);
							}
						} catch (error) {
							debug('ERROR:', error);
						}
					});

					collector.stdout.on('data', (data) => {
						writeCollectorLog(logFile, hostname, dir, 
							collector.pid, data.toString());
					});

					collector.stderr.on('data', (data) => {
						writeCollectorLog(logFile, hostname, dir, 
							collector.pid, data.toString());
					});

					let znode = conf.zookeeper.collectorInfoPath + '/' + dir + 
						'@' + hostname;

					collectorMap.set(collector.pid, {
						moduleName: dir, 
						process: collector,
						logFile: logFile,
						znode: znode
					});

					try {
						await zookeeperLib.createNode(zkClient, znode, true);
					} catch (err) {
						debug('ERROR:', err);
					}

					return dir;
				} catch (err) {
					debug('ERROR:', err.message);
					return null;
				}
			}));

			runningCollectors = runningCollectors.filter((collector) => {
				return collector != null;
			});

			debug('Executed collector modules: %o', runningCollectors);
			resolve(runningCollectors);
		} catch (err) {
			debug('ERROR:', err);
			reject(runningCollectors);
			return;
		}
	});
}


async function releaseCollector(zkClient, pid) {
	let result = false;

	try {
		let collector = collectorMap.get(pid);

		if (collector) {
			if (collector.logFile) collector.logFile.end();
			collector.process.kill('SIGTERM');
			collectorMap.delete(pid);
			runningCollectors.splice(
				runningCollectors.indexOf(collector.moduleName), 1);
			result = true;

			try {
				await zookeeperLib.deleteNode(zkClient, collector.znode);
			} catch (err) {
				debug('ERROR:', err);
			}
		}
	} catch (err) {
		debug('ERROR:', err);
	} finally {
		return result;
	}
}


function writeCollectorLog(file, hostname, moduleName, pid, data) {
	let result = false;

	try {
		let datetime = new Date().toString().split(' ').slice(1, 5).join(' ');
		file.write(datetime + ' ' + hostname + ' ' +  moduleName + '[' + pid + 
			']: ' + data);
		result = true;
	} catch (err) {
		debug('ERROR: %s: %s', moduleName, err);
	} finally {
		return result;
	}
}


async function checkRemovedCollectors(zkClient) {
	let modules = [];

	try {
		let workingDir;

		modules = fs.readdirSync(conf.moduleDir).filter((file) => {
			workingDir = path.join(conf.moduleDir, file);
			return fs.statSync(workingDir).isDirectory();
		});

		if (modules.length) {
			debug('Collector modules in %s: %o', conf.moduleDir, modules);
		} else {
			debug('No collector modules in', conf.moduleDir);
		}

		let existent;

		for (let collector of collectorMap.entries()) {
			existent = modules.find((module) => {
				return module === collector[1].moduleName;
			});

			if (!existent) {
				await releaseCollector(zkClient, collector[0]);
			}
		}
	} catch (err) {
		debug('ERROR:', err);
	} finally {
		return modules;
	}
}


function isProcessRunning(pid) {
	let result = false;

	try {
		let command = checkProcessCommand.replace('$$CPID$$', pid);
		let lc = childProcess.execSync(command);
		result = Number(lc) > 0 ? true : false;
	} catch (err) {
		debug('ERROR:', err);
	} finally {
		return result;
	}
}


async function checkLiveCollectorsOneByOne(zkClient) {
	try {
		for (let collector of collectorMap.entries()) {
			if (!isProcessRunning(collector[0])) {
				await releaseCollector(zkClient, collector[0]);
			}
		}
	} catch (err) {
		debug('ERROR:', err);
	}
}


function getLiveProcessList() {
	let liveList = null;

	try {
		let lives = childProcess.execSync(getLiveProcessesCommand);
		if (lives && lives.length > 0) {
			liveList = String(lives).trimRight().split('\n');
		} else {
			liveList = [];
		}
		debug('Live module PIDs: %o', liveList);
	} catch (err) {
		debug('ERROR:', err);
	} finally {
		return liveList;
	}
}


async function checkLiveCollectors(zkClient) {
	let live, liveList = null;

	try {
		liveList = getLiveProcessList();
		if (!liveList) {
			throw new Error('Failed to get a live process list');
		}
		
		for (let collector of collectorMap.entries()) {
			live = liveList.find((pid) => {
				return Number(pid) == collector[0];
			});

			if (!live) {
				await releaseCollector(zkClient, collector[0]);
			}
		}
	} catch (err) {
		debug('ERROR:', err);
	} finally {
		return liveList;
	}
}


module.exports = {
	collectorMap: collectorMap,
	runCollectors: runCollectors,
	checkRemovedCollectors: checkRemovedCollectors,
	checkLiveCollectors: checkLiveCollectors
};
