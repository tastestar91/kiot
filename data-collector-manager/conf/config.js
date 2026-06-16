'use strict';

// Development version?
const dev = false;

const dataCollector = {
	dev: dev,
	monitoringInterval: 5000,
	moduleDir: dev ? './test-collectors' : '/opt/apps/collectors',
	logDir: dev ? '/var/log/data-collector-manager-dev' : 
		'/var/log/data-collector-manager',
	moduleLang: {
		nodejs: {
			npm: '/usr/local/bin/npm',
			node: '/usr/local/bin/node',
			// mainFiles: ['app.js', 'index.js', 'main.js']
			mainFiles: []
		},
		python2: {
			python: '/usr/bin/python2',
			// mainFiles: ['app.py2', 'main.py2']
			mainFiles: []
		},
		python3: {
			python: '/usr/bin/python3',
			// mainFiles: ['app.py', 'main.py', 'app.py3', 'main.py3']
			mainFiles: []
		},
		shell: {
			sh: '/bin/bash',
			// mainFiles: ['app.sh', 'main.sh']
			mainFiles: []
		}
	},
	zookeeper: {
		quorum: [
			'kiot1:32181,kiot2:32181,kiot3:32181,kiot4:32181,kiot5:32181'
		],
		collectorInfoPath:
			dev ? '/data-collector-manager-dev/collectors/kwkiotcluster' :
				'/data-collector-manager/collectors/kwkiotcluster'
	},
	redis: {
		address: [
			'kiot1:36379,kiot3:36379,kiot4:36379,kiot5:36379,kiot6:36379'
		],
		password: undefined,
		dataPostReqChannel: 
			dev ? 'data-collector-manager-dev/v1/servers.post' : 
				'data-collector-manager/v1/servers.post'
	},
	ingressRouter: {
		address: dev ? '10.100.100.110:20002' : '10.100.100.110:20001',
		unixDomainSocket: 
			dev ? '/tmp/ingress-router-dev.sock' : '/tmp/ingress-router.sock',
		apiPath: {
			enrichers: '/v1/enrichers',
			servers: '/v1/servers'
		}
	}
};


module.exports = {
	dataCollector: dataCollector
};
