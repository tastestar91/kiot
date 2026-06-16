'use strict';

const debug =
	require('debug')('ingress-router:enricher:enr-kw-sensor-coci-v1');

const qi = {		// Quality index
	GOOD: 1,
	MODERATE: 2,
	BAD: 3,
	VERYBAD: 4
};

const defaultScore = 80;


// Calculate K-Weather COCI (comprehensive outdoor comfort index) version 1
function enrich(irData) {
	return new Promise((resolve, reject) => {
		try {
			if (irData.data.pm10 === undefined && 
				irData.data.pm25 === undefined) {
				throw new Error('No sensor data for COCI: ' + 
					irData.service.id + ': ' + irData.service.deviceId);
			}

			let data = {}, sensorList = [], qiBadCount = 0, score, index;

			// PM10 score and QI
			if (irData.data.pm10 === undefined || irData.data.pm10 < 0) {
				score = defaultScore;
				index = qi.MODERATE;
			} else if (irData.data.pm10 < 31) {		// 0 ~ 30
				score = Math.round(100 - 10 / 30 * irData.data.pm10);
				index = qi.GOOD;
			} else if (irData.data.pm10 < 81) {		// 31 ~ 80
				score = Math.round(89 - 9 / 49 * (irData.data.pm10 - 31));
				index = qi.MODERATE;
			} else if (irData.data.pm10 < 151) {	// 81 ~ 150
				score = Math.round(79 - 29 / 69 * (irData.data.pm10 - 81));
				index = qi.BAD;
				++qiBadCount;
			} else if (irData.data.pm10 < 601) {	// 151 ~ 600
				score = Math.round(49 - 49 / 449 * (irData.data.pm10 - 151));
				index = qi.VERYBAD;
				++qiBadCount;
			} else {								// 601 ~
				score = 0;
				index = qi.VERYBAD;
				++qiBadCount;
			}

			data.coci_pm10 = score;
			sensorList.push({ name: 'pm10', score: score, index: index });

			// PM2.5 score and QI
			if (irData.data.pm25 === undefined || irData.data.pm25 < 0) {
				score = defaultScore;
				index = qi.MODERATE;
			} else if (irData.data.pm25 < 16) {		// 0 ~ 15
				score = Math.round(100 - 10 / 15 * irData.data.pm25);
				index = qi.GOOD;
			} else if (irData.data.pm25 < 36) {		// 16 ~ 35
				score = Math.round(89 - 9 / 19 * (irData.data.pm25 - 16));
				index = qi.MODERATE;
			} else if (irData.data.pm25 < 76) {		// 36 ~ 75
				score = Math.round(79 - 29 / 39 * (irData.data.pm25 - 36));
				index = qi.BAD;
				++qiBadCount;
			} else if (irData.data.pm25 < 501) {	// 76 ~ 500
				score = Math.round(49 - 49 / 424 * (irData.data.pm25 - 76));
				index = qi.VERYBAD;
				++qiBadCount;
			} else {								// 501 ~
				score = 0;
				index = qi.VERYBAD;
				++qiBadCount;
			}

			data.coci_pm25 = score;
			sensorList.push({ name: 'pm25', score: score, index: index });

			// COAI (comprehensive outdoor air-pollution index)
			let weightGood, weightBad;
			if (qiBadCount === 1) {
				weightBad = 0.6;
				weightGood = 0.4;
			} else {
				weightBad = weightGood = 0.5;
			}

			let coai = 0;
			for (let i = 0; i < 2; ++i) {		// sensorList.length = 2
				if (sensorList[i].index > qi.MODERATE) {
					coai += sensorList[i].score * weightBad;
				} else {
					coai += sensorList[i].score * weightGood;
				}
			}

			// COCI (comprehensive outdoor comfort index)
			let coci = data.coai = Math.round(coai);

			// Temperature score
			if (irData.data.temp === undefined) {
				score = defaultScore;
				coci += 2;		// qi.MODERATE
			} else if (irData.data.temp >= 50.1) {		// 50.1 ~
				score = 0;
				coci -= 5;		// qi.VERYBAD
			} else if (irData.data.temp >= 33.1) {		// 33.1 ~ 50.0
				score = Math.round(49 - 49 / 16.9 * (irData.data.temp - 33.1));
				coci -= 5;		// qi.VERYBAD
			} else if (irData.data.temp >= 25.1) {		// 25.1 ~ 33.0
				score = Math.round(79 - 29 / 7.9 * (irData.data.temp - 25.1));
				coci -= 2;		// qi.BAD
			} else if (irData.data.temp >= 18.1) {		// 18.1 ~ 25.0
				score = Math.round(89 - 9 / 6.9 * (irData.data.temp - 18.1));
				coci += 2;		// qi.MODERATE
			} else if (irData.data.temp >= 13.5) {		// 13.5 ~ 18.0
				score = Math.round(100 - 10 / 4.5 * (irData.data.temp - 13.5));
				coci += 5;		// qi.GOOD
			} else if (irData.data.temp >= 9.0) {		// 9.0 ~ 13.5
				score = Math.round(100 - 10 / 4.5 * (13.5 - irData.data.temp));
				coci += 5;		// qi.GOOD
			} else if (irData.data.temp >= 0) {			// 0.0 ~ 8.9
				score = Math.round(89 - 9 / 8.9 * (8.9 - irData.data.temp));
				coci += 2;		// qi.MODERATE
			} else if (irData.data.temp >= -5.0) {		// -5.0 ~ -0.1
				score = Math.round(79 + 29 / 4.9 * (irData.data.temp + 0.1));
				coci -= 2;		// qi.BAD
			} else if (irData.data.temp >= -30.0) {		// -30.0 ~ -5.1
				score = Math.round(49 + 49 / 24.9 * (irData.data.temp + 5.1));
				coci -= 5;		// qi.VERYBAD
			} else {									// ~ -30.1
				score = 0;
				coci -= 5;		// qi.VERYBAD
			}

			data.coci_temp = score;

			// Humidity score
			if (irData.data.humi === undefined || irData.data.humi < 0 ||
				irData.data.humi > 100) {
				score = defaultScore;
				coci += 2;		// qi.MODERATE
			} else if (irData.data.humi >= 90.1) {		// 90.1 ~ 100.0
				score = Math.round(49 - 49 / 9.9 * (irData.data.humi - 90.1));
				coci -= 5;		// qi.VERYBAD
			} else if (irData.data.humi >= 80.1) {		// 80.1 ~ 90.0
				score = Math.round(79 - 29 / 9.9 * (irData.data.humi - 80.1));
				coci -= 2;		// qi.BAD
			} else if (irData.data.humi >= 70.1) {		// 70.1 ~ 80.0
				score = Math.round(89 - 9 / 9.9 * (irData.data.humi - 70.1));
				coci += 2;		// qi.MODERATE
			} else if (irData.data.humi >= 60.0) {		// 60.0 ~ 70.0
				score = Math.round(100 - 10 / 10 * (irData.data.humi - 60.0));
				coci += 5;		// qi.GOOD
			} else if (irData.data.humi >= 50.0) {		// 50.0 ~ 60.0
				score = Math.round(100 - 10 / 10 * (60.0 - irData.data.humi));
				coci += 5;		// qi.GOOD
			} else if (irData.data.humi >= 40.0) {		// 40.0 ~ 49.9
				score = Math.round(89 - 9 / 9.9 * (49.9 - irData.data.humi));
				coci += 2;		// qi.MODERATE
			} else if (irData.data.humi >= 30.0) {		// 30.0 ~ 39.9
				score = Math.round(79 - 29 / 9.9 * (39.9 - irData.data.humi));
				coci -= 2;		// qi.BAD
			} else {									// 0.0 ~ 29.9
				score = Math.round(49 - 49 / 29.9 * (29.9 - irData.data.humi));
				coci -= 5;		// qi.VERYBAD
			}

			data.coci_humi = score;

			if (coci > 100) {
				data.coci = 100;
			} else if (coci < 0) {
				data.coci = 0;
			} else {
				data.coci = coci;
			}

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
