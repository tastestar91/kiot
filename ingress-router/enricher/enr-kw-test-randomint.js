'use strict';

const debug =
	require('debug')('ingress-router:enricher:enr-kw-test-randomint');


function getRandomInt(min, max) {
	return ~~(Math.random() * (max - min)) + min;
}


function enrich(irData) {
	return new Promise((resolve, reject) => {
		try {
			let item = {
				randomInt: getRandomInt(0, 101)
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
