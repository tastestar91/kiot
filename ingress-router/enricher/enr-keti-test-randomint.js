'use strict';

const debug =
	require('debug')('ingress-router:enricher:enr-keti-test-randomint');


function getRandomInt(min, max) {
	return ~~(Math.random() * (max - min)) + min;
}


function enrich(irData) {
	return new Promise((resolve, reject) => {
		try {
			let item = {
				randomInt: {
					time: ~~(+new Date() / 1000),
					value: getRandomInt(0, 101)
				}
			};

			resolve(item);
		} catch (err) {
			debug('ERROR:', err);
			reject(err);
		}
	});
}


module.exports = {
	enrich: enrich
};
