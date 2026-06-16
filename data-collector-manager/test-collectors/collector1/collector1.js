'use strict';

let count = 0;

let timeoutExecution = setInterval(() => {
	console.log('Running a test collector...');
	++count;
	if (count > 30) {
		process.exit();
	}
}, 2000);

['exit', 'SIGINT', 'SIGTERM', 'SIGQUIT']
	.forEach(signal => process.on(signal, () => {
		console.log('Exited: %s', signal);
		process.exit();
	}));

