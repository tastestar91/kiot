'use strict';

const debug =
	require('debug')('ingress-router:enricher:enr-kw-sensor-coci-v2');

const qi = {		// Quality index
	ERROR: 0,
	GOOD: 1,
	MODERATE: 2,
	BAD: 3,
	VERYBAD: 4
};


// Calculate K-Weather COCI (comprehensive outdoor comfort index) version 1
function enrich(irData) {
	return new Promise((resolve, reject) => {
		try {
			//debug('INFO: irData.data=', irData.data);

			if (irData.data.pm10 === undefined && 
				irData.data.pm25 === undefined) {
				throw new Error('No sensor data for COCI 1: ' + 
					irData.service.id + ': ' + irData.service.deviceId);
			}

			let data = {}, sensorList = [], qiBadCount = 0, score, index;
			let qiTotCount = 0, scoreTot = 0;

			// PM10 score and QI
			if (irData.data.pm10 === undefined || irData.data.pm10 < 0) {
				index = qi.ERROR;
			} else if (irData.data.pm10 < 31) {		// 0 ~ 30
				score = 100 - 10 / 30 * irData.data.pm10;
				index = qi.GOOD;
			} else if (irData.data.pm10 < 81) {		// 31 ~ 80
				score = 89 - 9 / 49 * (irData.data.pm10 - 31);
				index = qi.MODERATE;
			} else if (irData.data.pm10 < 151) {	// 81 ~ 150
				score = 79 - 29 / 69 * (irData.data.pm10 - 81);
				index = qi.BAD;
				++qiBadCount;
			} else if (irData.data.pm10 < 601) {	// 151 ~ 600
				score = 49 - 49 / 449 * (irData.data.pm10 - 151);
				index = qi.VERYBAD;
				++qiBadCount;
			} else {								// 601 ~
				score = 0;
				index = qi.VERYBAD;
				++qiBadCount;
			}

			if (index > qi.ERROR) {
				score = parseFloat(score.toFixed(1));
				data.coci_pm10 = score;
				sensorList.push({ name: 'pm10', score: score, index: index });
				++qiTotCount;
				scoreTot += score;
			}

			// PM2.5 score and QI
			if (irData.data.pm25 === undefined || irData.data.pm25 < 0) {
				index = qi.ERROR;
			} else if (irData.data.pm25 < 16) {		// 0 ~ 15
				score = 100 - 10 / 15 * irData.data.pm25;
				index = qi.GOOD;
			} else if (irData.data.pm25 < 36) {		// 16 ~ 35
				score = 89 - 9 / 19 * (irData.data.pm25 - 16);
				index = qi.MODERATE;
			} else if (irData.data.pm25 < 76) {		// 36 ~ 75
				score = 79 - 29 / 39 * (irData.data.pm25 - 36);
				index = qi.BAD;
				++qiBadCount;
			} else if (irData.data.pm25 < 501) {	// 76 ~ 500
				score = 49 - 49 / 424 * (irData.data.pm25 - 76);
				index = qi.VERYBAD;
				++qiBadCount;
			} else {								// 501 ~
				score = 0;
				index = qi.VERYBAD;
				++qiBadCount;
			}

			if (index > qi.ERROR) {
				score = parseFloat(score.toFixed(1));
				data.coci_pm25 = score;
				sensorList.push({ name: 'pm25', score: score, index: index });
				++qiTotCount;
				scoreTot += score;
			}


			// COAI (comprehensive outdoor air-pollution index)
			if (qiTotCount < 1 || qiTotCount > 2 ||
				qiBadCount < 0 || qiBadCount > 2) {
				throw new Error('No sensor data for COCI 2: ' + 
					irData.service.id + ': ' + irData.service.deviceId);
			}

			let weightGood, weightBad;
			if (qiTotCount === 2) {
				if (qiBadCount === 1) {
					weightBad = 0.6;
					weightGood = 0.4;
				} else {
					weightBad = weightGood = 0.5;
				}
			} else {
				weightBad = weightGood = 1;
			}

			//debug('INFO: sensorList=', sensorList);
			//debug('INFO: weightGood=', weightGood);
			//debug('INFO: weightBad=', weightBad);

			let coai = 0;
			if (qiBadCount === qiTotCount || qiBadCount === 0) {
				coai = scoreTot / qiTotCount;
			} else {
				for (let i = 0; i < qiTotCount; ++i) {
					if (sensorList[i].index > qi.MODERATE) {
						coai += sensorList[i].score * weightBad;
					} else {
						coai += sensorList[i].score * weightGood;
					}
				}
			}
			//debug('INFO: coai=', coai);

			// COCI (comprehensive outdoor comfort index)
			let coci = data.coai = Math.round(coai);
			qiTotCount = 0;
			scoreTot = 0;

			// Temperature score
			if (irData.data.temp === undefined) {
				score = -1;
			} else if (irData.data.temp >= 50.1) {		// 50.1 ~
				score = 0;
				scoreTot -= 5;		// qi.VERYBAD
			} else if (irData.data.temp >= 33.1) {		// 33.1 ~ 50.0
				score = 49 - 49 / 16.9 * (irData.data.temp - 33.1);
				scoreTot -= 5;		// qi.VERYBAD
			} else if (irData.data.temp >= 25.1) {		// 25.1 ~ 33.0
				score = 79 - 29 / 7.9 * (irData.data.temp - 25.1);
				scoreTot -= 2;		// qi.BAD
			} else if (irData.data.temp >= 18.1) {		// 18.1 ~ 25.0
				score = 89 - 9 / 6.9 * (irData.data.temp - 18.1);
				scoreTot += 2;		// qi.MODERATE
			} else if (irData.data.temp >= 13.5) {		// 13.5 ~ 18.0
				score = 100 - 10 / 4.5 * (irData.data.temp - 13.5);
				scoreTot += 5;		// qi.GOOD
			} else if (irData.data.temp >= 9.0) {		// 9.0 ~ 13.5
				score = 100 - 10 / 4.5 * (13.5 - irData.data.temp);
				scoreTot += 5;		// qi.GOOD
			} else if (irData.data.temp >= 0) {			// 0.0 ~ 8.9
				score = 89 - 9 / 8.9 * (8.9 - irData.data.temp);
				scoreTot += 2;		// qi.MODERATE
			} else if (irData.data.temp >= -5.0) {		// -5.0 ~ -0.1
				score = 79 + 29 / 4.9 * (irData.data.temp + 0.1);
				scoreTot -= 2;		// qi.BAD
			} else if (irData.data.temp >= -30.0) {		// -30.0 ~ -5.1
				score = 49 + 49 / 24.9 * (irData.data.temp + 5.1);
				scoreTot -= 5;		// qi.VERYBAD
			} else {									// ~ -30.1
				score = 0;
				scoreTot -= 5;		// qi.VERYBAD
			}

			if (score > -1) {
				score = parseFloat(score.toFixed(1));
				data.coci_temp = score;
				++qiTotCount;
			}


			// Humidity score
			if (irData.data.humi === undefined || irData.data.humi < 0 ||
				irData.data.humi > 100) {
				score = -1;
			} else if (irData.data.humi >= 90.1) {		// 90.1 ~ 100.0
				score = 49 - 49 / 9.9 * (irData.data.humi - 90.1);
				scoreTot -= 5;		// qi.VERYBAD
			} else if (irData.data.humi >= 80.1) {		// 80.1 ~ 90.0
				score = 79 - 29 / 9.9 * (irData.data.humi - 80.1);
				scoreTot -= 2;		// qi.BAD
			} else if (irData.data.humi >= 70.1) {		// 70.1 ~ 80.0
				score = 89 - 9 / 9.9 * (irData.data.humi - 70.1);
				scoreTot += 2;		// qi.MODERATE
			} else if (irData.data.humi >= 60.0) {		// 60.0 ~ 70.0
				score = 100 - 10 / 10 * (irData.data.humi - 60.0);
				scoreTot += 5;		// qi.GOOD
			} else if (irData.data.humi >= 50.0) {		// 50.0 ~ 60.0
				score = 100 - 10 / 10 * (60.0 - irData.data.humi);
				scoreTot += 5;		// qi.GOOD
			} else if (irData.data.humi >= 40.0) {		// 40.0 ~ 49.9
				score = 89 - 9 / 9.9 * (49.9 - irData.data.humi);
				scoreTot += 2;		// qi.MODERATE
			} else if (irData.data.humi >= 30.0) {		// 30.0 ~ 39.9
				score = 79 - 29 / 9.9 * (39.9 - irData.data.humi);
				scoreTot -= 2;		// qi.BAD
			} else {									// 0.0 ~ 29.9
				score = 49 - 49 / 29.9 * (29.9 - irData.data.humi);
				scoreTot -= 5;		// qi.VERYBAD
			}

			if (score > -1) {
				score = parseFloat(score.toFixed(1));
				data.coci_humi = score;
				++qiTotCount;
			}

			if (qiTotCount === 2) {
				coci += scoreTot;
			}

			//debug('INFO: qiTotCount=', qiTotCount);
			//debug('INFO: scoreTot=', scoreTot);

			if (coci > 100) {
				data.coci = 100;
			} else if (coci < 0) {
				data.coci = 0;
			} else {
				data.coci = coci;
			}

			//debug('INFO: data=', data);

			resolve(data);
		} catch (err) {
			debug('ERROR:', err.message);
			reject(err);
		}
	});
}


module.exports = {
	enrich: enrich
};
