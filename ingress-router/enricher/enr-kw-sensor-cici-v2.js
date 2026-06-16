'use strict';

const debug =
	require('debug')('ingress-router:enricher:enr-kw-sensor-cici-v2');

const aqi = {		// Air quality index
	ERROR: 0,
	GOOD: 1,
	MODERATE: 2,
	BAD: 3,
	VERYBAD: 4
};


// Calculate K-Weather CICI (comprehensive indoor comfort index) version 2
function enrich(irData) {
	return new Promise((resolve, reject) => {
		try {
			//debug('INFO: irData.data=', irData.data);

			if (irData.data.pm10 === undefined && 
				irData.data.pm25 === undefined &&
				irData.data.co2 === undefined &&
				irData.data.voc === undefined) {
				throw new Error('No sensor data for CICI 1: ' + 
					irData.service.id + ': ' + irData.service.deviceId);
			}

			let data = {}, sensorList = [], aqiBadCount = 0, score, index;
			let aqiTotCount = 0, scoreTot = 0;

			// PM10 score and AQI
			if (irData.data.pm10 === undefined || irData.data.pm10 < 0) {
				index = aqi.ERROR;
			} else if (irData.data.pm10 < 31) {		// 0 ~ 30
				score = 100 - 10 / 30 * irData.data.pm10;
				index = aqi.GOOD;
			} else if (irData.data.pm10 < 81) {		// 31 ~ 80
				score = 89 - 9 / 49 * (irData.data.pm10 - 31);
				index = aqi.MODERATE;
			} else if (irData.data.pm10 < 151) {	// 81 ~ 150
				score = 79 - 29 / 69 * (irData.data.pm10 - 81);
				index = aqi.BAD;
				++aqiBadCount;
			} else if (irData.data.pm10 < 601) {	// 151 ~ 600
				score = 49 - 49 / 449 * (irData.data.pm10 - 151);
				index = aqi.VERYBAD;
				++aqiBadCount;
			} else {								// 601 ~
				score = 0;
				index = aqi.VERYBAD;
				++aqiBadCount;
			}

			if (index > aqi.ERROR) {
				score = parseFloat(score.toFixed(1));
				data.cici_pm10 = score;
				sensorList.push({ name: 'pm10', score: score, index: index });
				++aqiTotCount;
				scoreTot += score;
			}


			// PM2.5 score and AQI
			if (irData.data.pm25 === undefined || irData.data.pm25 < 0) {
				index = aqi.ERROR;
			} else if (irData.data.pm25 < 16) {		// 0 ~ 15
				score = 100 - 10 / 15 * irData.data.pm25;
				index = aqi.GOOD;
			} else if (irData.data.pm25 < 36) {		// 16 ~ 35
				score = 89 - 9 / 19 * (irData.data.pm25 - 16);
				index = aqi.MODERATE;
			} else if (irData.data.pm25 < 76) {		// 36 ~ 75
				score = 79 - 29 / 39 * (irData.data.pm25 - 36);
				index = aqi.BAD;
				++aqiBadCount;
			} else if (irData.data.pm25 < 501) {	// 76 ~ 500
				score = 49 - 49 / 424 * (irData.data.pm25 - 76);
				index = aqi.VERYBAD;
				++aqiBadCount;
			} else {								// 501 ~
				score = 0;
				index = aqi.VERYBAD;
				++aqiBadCount;
			}

			if (index > aqi.ERROR) {
				score = parseFloat(score.toFixed(1));
				data.cici_pm25 = score;
				sensorList.push({ name: 'pm25', score: score, index: index });
				++aqiTotCount;
				scoreTot += score;
			}


			// CO2 score and AQI
			if (irData.data.co2 === undefined || irData.data.co2 < 0) {
				index = aqi.ERROR;
			} else if (irData.data.co2 < 501) {		// 0 ~ 500
				score = 100 - 10 / 500 * irData.data.co2;
				index = aqi.GOOD;
			} else if (irData.data.co2 < 1001) {	// 501 ~ 1000
				score = 89 - 9 / 499 * (irData.data.co2 - 501);
				index = aqi.MODERATE;
			} else if (irData.data.co2 < 1501) {	// 1001 ~ 1500
				score = 79 - 29 / 499 * (irData.data.co2 - 1001);
				index = aqi.BAD;
				++aqiBadCount;
			} else if (irData.data.co2 < 10001) {	// 1501 ~ 10000
				score = 49 - 49 / 8499 * (irData.data.co2 - 1501);
				index = aqi.VERYBAD;
				++aqiBadCount;
			} else {								// 10001 ~
				score = 0;
				index = aqi.VERYBAD;
				++aqiBadCount;
			}

			if (index > aqi.ERROR) {
				score = parseFloat(score.toFixed(1));
				data.cici_co2 = score;
				sensorList.push({ name: 'co2', score: score, index: index });
				++aqiTotCount;
				scoreTot += score;
			}


			// VOC score and AQI
			if (irData.data.voc === undefined || irData.data.voc < 0) {
				index = aqi.ERROR;
			} else if (irData.data.voc < 201) {		// 0 ~ 200
				score = 100 - 10 / 200 * irData.data.voc;
				index = aqi.GOOD;
			} else if (irData.data.voc < 401) {		// 201 ~ 400
				score = 89 - 9 / 199 * (irData.data.voc - 201);
				index = aqi.MODERATE;
			} else if (irData.data.voc < 1001) {	// 401 ~ 1000
				score = 79 - 29 / 599 * (irData.data.voc - 401);
				index = aqi.BAD;
				++aqiBadCount;
			} else if (irData.data.voc < 10001) {	// 1001 ~ 10000
				score = 49 - 49 / 8999 * (irData.data.voc - 1001);
				index = aqi.VERYBAD;
				++aqiBadCount;
			} else {								// 10001 ~
				score = 0;
				index = aqi.VERYBAD;
				++aqiBadCount;
			}

			if (index > aqi.ERROR) {
				score = parseFloat(score.toFixed(1));
				data.cici_voc = score;
				sensorList.push({ name: 'voc', score: score, index: index });
				++aqiTotCount;
				scoreTot += score;
			}

			// CIAI (comprehensive indoor air-pollution index)
			if (aqiTotCount < 1 || aqiTotCount > 4 || 
				aqiBadCount < 0 || aqiBadCount > 4) {
				throw new Error('No sensor data for CICI 2: ' + 
					irData.service.id + ': ' + irData.service.deviceId);
			}

			let weightGood, weightBad;
			if (aqiTotCount == 4) {
				if (aqiBadCount === 1) {
					weightBad = 0.4;
					weightGood = 0.2;
				} else if (aqiBadCount === 2) {
					weightBad = 0.3;
					weightGood = 0.2;
				} else if (aqiBadCount === 3) {
					weightBad = 0.3;
					weightGood = 0.1;
				} else {
					weightBad = weightGood = 0.25;
				}
			} else if (aqiTotCount === 3) {
				if (aqiBadCount === 1) {
					weightBad = 0.5;
					weightGood = 0.25;
				} else if (aqiBadCount === 2) {
					weightBad = 0.4;
					weightGood = 0.2;
				} else {
					weightBad = weightGood = 0.33333;
				}
			} else if (aqiTotCount === 2) {
				if (aqiBadCount === 1) {
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

			let ciai = 0;
			if (aqiBadCount === aqiTotCount || aqiBadCount === 0) {
				ciai = scoreTot / aqiTotCount;
			} else {
				for (let i = 0; i < aqiTotCount; ++i) {
					if (sensorList[i].index > aqi.MODERATE) {
						ciai += sensorList[i].score * weightBad;
					} else {
						ciai += sensorList[i].score * weightGood;
					}
				}
			}
			//debug('INFO: ciai=', ciai);

			// CICI (comprehensive indoor comfort index)
			let cici = data.ciai = Math.round(ciai);
			aqiTotCount = 0;
			scoreTot = 0;

			// Temperature score
			if (irData.data.temp === undefined) {
				score = -1;
			} else if (irData.data.temp >= 34.1) {		// 34.1 ~
				score = 0;
				scoreTot -= 5;		// aqi.VERYBAD
			} else if (irData.data.temp >= 30.1) {		// 30.1 ~ 34.0
				score = 49 - 49 / 3.9 * (irData.data.temp - 30.1);
				scoreTot -= 5;		// aqi.VERYBAD
			} else if (irData.data.temp >= 27.1) {		// 27.1 ~ 30.0
				score = 79 - 29 / 2.9 * (irData.data.temp - 27.1);
				scoreTot -= 2;		// aqi.BAD
			} else if (irData.data.temp >= 24.1) {		// 24.1 ~ 27.0
				score = 89 - 9 / 2.9 * (irData.data.temp - 24.1);
				scoreTot += 2;		// aqi.MODERATE
			} else if (irData.data.temp >= 21.0) {		// 21.0 ~ 24.0
				score = 100 - 10 / 3 * (irData.data.temp - 21.0);
				scoreTot += 5;		// aqi.GOOD
			} else if (irData.data.temp >= 18.0) {		// 18.0 ~ 20.9
				score = 100 - 10 / 2.9 *(20.9 - irData.data.temp);
				scoreTot += 5;		// aqi.GOOD
			} else if (irData.data.temp >= 16.0) {		// 16.0 ~ 17.9
				score = 89 - 9 / 1.9 * (17.9 - irData.data.temp);
				scoreTot += 2;		// aqi.MODERATE
			} else if (irData.data.temp >= 14.0) {		// 14.0 ~ 15.9
				score = 79 - 29 / 1.9 * (15.9 - irData.data.temp);
				scoreTot -= 2;		// aqi.BAD
			} else if (irData.data.temp >= 0) {			// 0.0 ~ 13.9
				score = 49 - 49 / 13.9 * (13.9 - irData.data.temp);
				scoreTot -= 5;		// aqi.VERYBAD
			} else {									// ~ -0.1
				score = 0;
				scoreTot -= 5;		// aqi.VERYBAD
			}

			if (score > -1) {
				score = parseFloat(score.toFixed(1));
				data.cici_temp = score;
				++aqiTotCount;
			}

			// Humidity score
			if (irData.data.humi === undefined || irData.data.humi < 0 ||
				irData.data.humi > 100) {
				score = -1;
			} else if (irData.data.humi >= 90.1) {		// 90.1 ~ 100.0
				score = 49 - 49 / 9.9 * (irData.data.humi - 90.1);
				scoreTot -= 5;		// aqi.VERYBAD
			} else if (irData.data.humi >= 75.1) {		// 75.1 ~ 90.0
				score = 79 - 29 / 14.9 * (irData.data.humi - 75.1);
				scoreTot -= 2;		// aqi.BAD
			} else if (irData.data.humi >= 60.1) {		// 60.1 ~ 75.0
				score = 89 - 9 / 14.9 * (irData.data.humi - 60.1);
				scoreTot += 2;		// aqi.MODERATE
			} else if (irData.data.humi >= 50.0) {		// 50.0 ~ 60.0
				score = 100 - 10 / 10 * (irData.data.humi - 50.0);
				scoreTot += 5;		// aqi.GOOD
			} else if (irData.data.humi >= 40.0) {		// 40.0 ~ 50.0
				score = 100 - 10 / 10 * (50.0 - irData.data.humi);
				scoreTot += 5;		// aqi.GOOD
			} else if (irData.data.humi >= 35.0) {		// 35.0 ~ 39.9
				score = 89 - 9 / 4.9 * (39.9 - irData.data.humi);
				scoreTot += 2;		// aqi.MODERATE
			} else if (irData.data.humi >= 20.0) {		// 20.0 ~ 34.9
				score = 79 - 29 / 14.9 * (34.9 - irData.data.humi);
				scoreTot -= 2;		// aqi.BAD
			} else {									// 0.0 ~ 19.9
				score = 49 - 49 / 19.9 * (19.9 - irData.data.humi);
				scoreTot -= 5;		// aqi.VERYBAD
			}

			if (score > -1) {
				score = parseFloat(score.toFixed(1));
				data.cici_humi = score;
				++aqiTotCount;
			}

			if (aqiTotCount === 2) {
				cici += scoreTot;
			}

			//debug('INFO: aqiTotCount=', aqiTotCount);
			//debug('INFO: scoreTot=', scoreTot);

			if (cici > 100) {
				data.cici = 100;
			} else if (cici < 0) {
				data.cici = 0;
			} else {
				data.cici = cici;
			}

			// Noise score
			if (irData.data.noise === undefined || irData.data.noise < 0) {
				score = -1;
			} else if (irData.data.noise < 31) {		// 0 ~ 30
				score = 100 - 10 / 30 * irData.data.noise;
			} else if (irData.data.noise < 56) {		// 31 ~ 55
				score = 89 - 9 / 24 * (irData.data.noise - 31);
			} else if (irData.data.noise < 71) {		// 56 ~ 70
				score = 79 - 29 / 14 * (irData.data.noise - 56);
			} else if (irData.data.noise < 101) {		// 71 ~ 100
				score = 49 - 49 / 29 * (irData.data.noise - 71);
			} else {									// 101 ~
				score = 0;
			}

			if (score > -1) {
				score = parseFloat(score.toFixed(1));
				data.cici_noise = score;
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
