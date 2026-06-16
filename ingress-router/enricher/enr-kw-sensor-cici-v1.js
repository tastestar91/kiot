'use strict';

const debug =
	require('debug')('ingress-router:enricher:enr-kw-sensor-cici-v1');

const aqi = {		// Air quality index
	GOOD: 1,
	MODERATE: 2,
	BAD: 3,
	VERYBAD: 4
};

const defaultScore = 80;


// Calculate K-Weather CICI (comprehensive indoor comfort index) version 1
function enrich(irData) {
	return new Promise((resolve, reject) => {
		try {
			if (irData.data.pm10 === undefined && 
				irData.data.pm25 === undefined &&
				irData.data.co2 === undefined &&
				irData.data.voc === undefined) {
				throw new Error('No sensor data for CICI: ' + 
					irData.service.id + ': ' + irData.service.deviceId);
			}

			let data = {}, sensorList = [], aqiBadCount = 0, score, index;

			// PM10 score and AQI
			if (irData.data.pm10 === undefined || irData.data.pm10 < 0) {
				score = defaultScore;
				index = aqi.MODERATE;
			} else if (irData.data.pm10 < 31) {		// 0 ~ 30
				score = Math.round(100 - 10 / 30 * irData.data.pm10);
				index = aqi.GOOD;
			} else if (irData.data.pm10 < 81) {		// 31 ~ 80
				score = Math.round(89 - 9 / 49 * (irData.data.pm10 - 31));
				index = aqi.MODERATE;
			} else if (irData.data.pm10 < 151) {	// 81 ~ 150
				score = Math.round(79 - 29 / 69 * (irData.data.pm10 - 81));
				index = aqi.BAD;
				++aqiBadCount;
			} else if (irData.data.pm10 < 601) {	// 151 ~ 600
				score = Math.round(49 - 49 / 449 * (irData.data.pm10 - 151));
				index = aqi.VERYBAD;
				++aqiBadCount;
			} else {								// 601 ~
				score = 0;
				index = aqi.VERYBAD;
				++aqiBadCount;
			}

			data.cici_pm10 = score;
			sensorList.push({ name: 'pm10', score: score, index: index });

			// PM2.5 score and AQI
			if (irData.data.pm25 === undefined || irData.data.pm25 < 0) {
				score = defaultScore;
				index = aqi.MODERATE;
			} else if (irData.data.pm25 < 16) {		// 0 ~ 15
				score = Math.round(100 - 10 / 15 * irData.data.pm25);
				index = aqi.GOOD;
			} else if (irData.data.pm25 < 36) {		// 16 ~ 35
				score = Math.round(89 - 9 / 19 * (irData.data.pm25 - 16));
				index = aqi.MODERATE;
			} else if (irData.data.pm25 < 76) {		// 36 ~ 75
				score = Math.round(79 - 29 / 39 * (irData.data.pm25 - 36));
				index = aqi.BAD;
				++aqiBadCount;
			} else if (irData.data.pm25 < 501) {	// 76 ~ 500
				score = Math.round(49 - 49 / 424 * (irData.data.pm25 - 76));
				index = aqi.VERYBAD;
				++aqiBadCount;
			} else {								// 501 ~
				score = 0;
				index = aqi.VERYBAD;
				++aqiBadCount;
			}

			data.cici_pm25 = score;
			sensorList.push({ name: 'pm25', score: score, index: index });

			// CO2 score and AQI
			if (irData.data.co2 === undefined || irData.data.co2 < 0) {
				score = defaultScore;
				index = aqi.MODERATE;
			} else if (irData.data.co2 < 501) {		// 0 ~ 500
				score = Math.round(100 - 10 / 500 * irData.data.co2);
				index = aqi.GOOD;
			} else if (irData.data.co2 < 1001) {	// 501 ~ 1000
				score = Math.round(89 - 9 / 499 * (irData.data.co2 - 501));
				index = aqi.MODERATE;
			} else if (irData.data.co2 < 1501) {	// 1001 ~ 1500
				score = Math.round(79 - 29 / 499 * (irData.data.co2 - 1001));
				index = aqi.BAD;
				++aqiBadCount;
			} else if (irData.data.co2 < 10001) {	// 1501 ~ 10000
				score = Math.round(49 - 49 / 8499 * (irData.data.co2 - 1501));
				index = aqi.VERYBAD;
				++aqiBadCount;
			} else {								// 10001 ~
				score = 0;
				index = aqi.VERYBAD;
				++aqiBadCount;
			}

			data.cici_co2 = score;
			sensorList.push({ name: 'co2', score: score, index: index });

			// VOC score and AQI
			if (irData.data.voc === undefined || irData.data.voc < 0) {
				score = defaultScore;
				index = aqi.MODERATE;
			} else if (irData.data.voc < 201) {		// 0 ~ 200
				score = Math.round(100 - 10 / 200 * irData.data.voc);
				index = aqi.GOOD;
			} else if (irData.data.voc < 401) {		// 201 ~ 400
				score = Math.round(89 - 9 / 199 * (irData.data.voc - 201));
				index = aqi.MODERATE;
			} else if (irData.data.voc < 1001) {	// 401 ~ 1000
				score = Math.round(79 - 29 / 599 * (irData.data.voc - 401));
				index = aqi.BAD;
				++aqiBadCount;
			} else if (irData.data.voc < 10001) {	// 1001 ~ 10000
				score = Math.round(49 - 49 / 8999 * (irData.data.voc - 1001));
				index = aqi.VERYBAD;
				++aqiBadCount;
			} else {								// 10001 ~
				score = 0;
				index = aqi.VERYBAD;
				++aqiBadCount;
			}

			data.cici_voc = score;
			sensorList.push({ name: 'voc', score: score, index: index });

			// CIAI (comprehensive indoor air-pollution index)
			let weightGood, weightBad;
			if (aqiBadCount === 0 || aqiBadCount === 4) {
				weightBad = weightGood = 0.25;
			} else if (aqiBadCount === 1) {
				weightBad = 0.4;
				weightGood = 0.2;
			} else {
				weightBad = 0.3;
				weightGood = (1 - 0.3 * aqiBadCount) / (4 - aqiBadCount);
			}

			let ciai = 0;
			for (let i = 0; i < 4; ++i) {		// sensorList.length = 4
				if (sensorList[i].index > aqi.MODERATE) {
					ciai += sensorList[i].score * weightBad;
				} else {
					ciai += sensorList[i].score * weightGood;
				}
			}

			// CICI (comprehensive indoor comfort index)
			let cici = data.ciai = Math.round(ciai);

			// Temperature score
			// modify cici logic, 2020-07-21 by yskwon
			/*
			if (irData.data.temp === undefined) {
				score = defaultScore;
				cici += 2;		// aqi.MODERATE
			} else if (irData.data.temp >= 34.1) {		// 34.1 ~
				score = 0;
				cici -= 5;		// aqi.VERYBAD
			} else if (irData.data.temp >= 27.1) {		// 27.1 ~ 34.0
				score = Math.round(49 - 49 / 6.9 * (irData.data.temp - 27.1));
				cici -= 5;		// aqi.VERYBAD
			} else if (irData.data.temp >= 24.1) {		// 24.1 ~ 27.0
				score = Math.round(79 - 29 / 2.9 * (irData.data.temp - 24.1));
				cici -= 2;		// aqi.BAD
			} else if (irData.data.temp >= 22.1) {		// 22.1 ~ 24.0
				score = Math.round(89 - 9 / 1.9 * (irData.data.temp - 22.1));
				cici += 2;		// aqi.MODERATE
			} else if (irData.data.temp >= 20.0) {		// 20.0 ~ 22.0
				score = Math.round(100 - 10 / 2 * (irData.data.temp - 20.0));
				cici += 5;		// aqi.GOOD
			} else if (irData.data.temp >= 18.0) {		// 18.0 ~ 19.9
				score = Math.round(100 - 10 / 1.9 *(19.9 - irData.data.temp));
				cici += 5;		// aqi.GOOD
			} else if (irData.data.temp >= 17.0) {		// 17.0 ~ 17.9
				score = Math.round(89 - 9 / 0.9 * (17.9 - irData.data.temp));
				cici += 2;		// aqi.MODERATE
			} else if (irData.data.temp >= 16.0) {		// 16.0 ~ 16.9
				score = Math.round(79 - 29 / 0.9 * (16.9 - irData.data.temp));
				cici -= 2;		// aqi.BAD
			} else if (irData.data.temp >= 0) {			// 0.0 ~ 15.9
				score = Math.round(49 - 49 / 15.9 * (15.9 - irData.data.temp));
				cici -= 5;		// aqi.VERYBAD
			} else {									// ~ -0.1
				score = 0;
				cici -= 5;		// aqi.VERYBAD
			}
			*/
			if (irData.data.temp === undefined) {
				score = defaultScore;
				cici += 2;		// aqi.MODERATE
			} else if (irData.data.temp >= 34.1) {		// 34.1 ~
				score = 0;
				cici -= 5;		// aqi.VERYBAD
			} else if (irData.data.temp >= 30.1) {		// 30.1 ~ 34.0
				score = Math.round(49 - 49 / 3.9 * (irData.data.temp - 30.1));
				cici -= 5;		// aqi.VERYBAD
			} else if (irData.data.temp >= 27.1) {		// 27.1 ~ 30.0
				score = Math.round(79 - 29 / 2.9 * (irData.data.temp - 27.1));
				cici -= 2;		// aqi.BAD
			} else if (irData.data.temp >= 24.1) {		// 24.1 ~ 27.0
				score = Math.round(89 - 9 / 2.9 * (irData.data.temp - 24.1));
				cici += 2;		// aqi.MODERATE
			} else if (irData.data.temp >= 21.0) {		// 21.0 ~ 24.0
				score = Math.round(100 - 10 / 3 * (irData.data.temp - 21.0));
				cici += 5;		// aqi.GOOD
			} else if (irData.data.temp >= 18.0) {		// 18.0 ~ 20.9
				score = Math.round(100 - 10 / 2.9 *(20.9 - irData.data.temp));
				cici += 5;		// aqi.GOOD
			} else if (irData.data.temp >= 16.0) {		// 16.0 ~ 17.9
				score = Math.round(89 - 9 / 1.9 * (17.9 - irData.data.temp));
				cici += 2;		// aqi.MODERATE
			} else if (irData.data.temp >= 14.0) {		// 14.0 ~ 15.9
				score = Math.round(79 - 29 / 1.9 * (15.9 - irData.data.temp));
				cici -= 2;		// aqi.BAD
			} else if (irData.data.temp >= 0) {			// 0.0 ~ 13.9
				score = Math.round(49 - 49 / 13.9 * (13.9 - irData.data.temp));
				cici -= 5;		// aqi.VERYBAD
			} else {									// ~ -0.1
				score = 0;
				cici -= 5;		// aqi.VERYBAD
			}

			data.cici_temp = score;

			// Humidity score
			if (irData.data.humi === undefined || irData.data.humi < 0 ||
				irData.data.humi > 100) {
				score = defaultScore;
				cici += 2;		// aqi.MODERATE
			} else if (irData.data.humi >= 90.1) {		// 90.1 ~ 100.0
				score = Math.round(49 - 49 / 9.9 * (irData.data.humi - 90.1));
				cici -= 5;		// aqi.VERYBAD
			} else if (irData.data.humi >= 75.1) {		// 75.1 ~ 90.0
				score = Math.round(79 - 29 / 14.9 * (irData.data.humi - 75.1));
				cici -= 2;		// aqi.BAD
			} else if (irData.data.humi >= 60.1) {		// 60.1 ~ 75.0
				score = Math.round(89 - 9 / 14.9 * (irData.data.humi - 60.1));
				cici += 2;		// aqi.MODERATE
			} else if (irData.data.humi >= 50.0) {		// 50.0 ~ 60.0
				score = Math.round(100 - 10 / 10 * (irData.data.humi - 50.0));
				cici += 5;		// aqi.GOOD
			} else if (irData.data.humi >= 40.0) {		// 40.0 ~ 50.0
				score = Math.round(100 - 10 / 10 * (50.0 - irData.data.humi));
				cici += 5;		// aqi.GOOD
			} else if (irData.data.humi >= 35.0) {		// 35.0 ~ 39.9
				score = Math.round(89 - 9 / 4.9 * (39.9 - irData.data.humi));
				cici += 2;		// aqi.MODERATE
			} else if (irData.data.humi >= 20.0) {		// 20.0 ~ 34.9
				score = Math.round(79 - 29 / 14.9 * (34.9 - irData.data.humi));
				cici -= 2;		// aqi.BAD
			} else {									// 0.0 ~ 19.9
				score = Math.round(49 - 49 / 19.9 * (19.9 - irData.data.humi));
				cici -= 5;		// aqi.VERYBAD
			}

			data.cici_humi = score;

			// Noise score
			if (irData.data.noise === undefined || irData.data.noise < 0) {
				score = defaultScore;
			} else if (irData.data.noise < 31) {		// 0 ~ 30
				score = Math.round(100 - 10 / 30 * irData.data.noise);
			} else if (irData.data.noise < 56) {		// 31 ~ 55
				score = Math.round(89 - 9 / 24 * (irData.data.noise - 31));
			} else if (irData.data.noise < 71) {		// 56 ~ 70
				score = Math.round(79 - 29 / 14 * (irData.data.noise - 56));
			} else if (irData.data.noise < 101) {		// 71 ~ 100
				score = Math.round(49 - 49 / 29 * (irData.data.noise - 71));
			} else {									// 101 ~
				score = 0;
			}

			data.cici_noise = score;

			if (cici > 100) {
				data.cici = 100;
			} else if (cici < 0) {
				data.cici = 0;
			} else {
				data.cici = cici;
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
