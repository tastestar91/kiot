"use strict";

const debug = require("debug")("ingress-router:enricher:enr-kw-sensor-cmd-iaqvent-v1");

const memStoreRedis = require("../manager/man-memstore-redis");
const http = require("../manager/man-http");
const serverTable = require("../conf/server-conf").serverTable;

const keyPrefix = "kw/iaq/cmd/v1/";

// Generate K-Weather IAQ-VENT command data (version 1)
function enrich(irData) {
  return new Promise(async (resolve, reject) => {
    try {
      let data = await memStoreRedis.get(keyPrefix + irData.service.deviceId);
      if (!data || data.vent.length < 1) {
        /*
				throw new Error('No IAQ status data for VENT control: ' + 
					irData.service.id + ': ' + irData.service.deviceId);
				*/
        resolve();
        return;
      }

      if (data.ai_mode_devices < 1) {
        resolve({ ai_mode_devices: data.ai_mode_devices });
        return;
      }

      let cmd_w = -1,
        w,
        cmd_m = 1;

      switch (data.vent[0].model) {
        case "AHU":
          let uri = "http://" + serverTable.kwKiotCluster.opentsdb.address + "/api/query?start=1h-ago&m=avg:1h-avg-none:kma-aq.4113351000{sensor=pm25}";

          let response, pm25_outside;
          try {
            response = await http.get(uri);
            pm25_outside = Object.values(JSON.parse(response)[0].dps)[0];
          } catch (err) {
            debug("WARN: Failed to get PM2.5 data:", err);
            pm25_outside = -1; // default PM2.5 value
          }

          // CO2
          if (irData.data.co2 === undefined || irData.data.co2 < 0) w = 0;
          else if (irData.data.co2 < 701) {
            // PM2.5
            if (irData.data.pm25 === undefined || irData.data.pm25 < 0) w = 0;
            else if (irData.data.pm25 < 36) w = 1;
            else {
              // Outside PM2.5
              if (pm25_outside === undefined || pm25_outside < 0) w = 0;
              else if (pm25_outside < 36) w = 3;
              else w = 2;
            }
          } else {
            // Outside PM2.5
            if (pm25_outside === undefined || pm25_outside < 0) w = 0;
            else if (pm25_outside < 36) w = 4;
            else {
              // PM2.5
              if (irData.data.pm25 === undefined || irData.data.pm25 < 0) w = 0;
              else if (irData.data.pm25 < 36) w = 2;
              else w = 3;
            }
          }

          cmd_w = w;

          break;

        case "KWG-ST1":
          // PM2.5
          if (irData.data.pm25 === undefined || irData.data.pm25 < 0) w = -1;
          else if (irData.data.pm25 < 16) w = 0; // 0 ~ 15
          else if (irData.data.pm25 < 26) w = 1; // 16 ~ 25
          else if (irData.data.pm25 < 36) w = 2; // 26 ~ 35
          else w = 3; // 36 ~

          cmd_w = w;

          // PM10
          if (irData.data.pm10 === undefined || irData.data.pm10 < 0) w = -1;
          else if (irData.data.pm10 < 31) w = 0; // 0 ~ 30
          else if (irData.data.pm10 < 56) w = 1; // 31 ~ 55
          else if (irData.data.pm10 < 81) w = 2; // 56 ~ 80
          else w = 3; // 81 ~

          if (w > cmd_w) cmd_w = w;

          break;

        case "KWV-AIC1":
          // PM2.5
          if (irData.data.pm25 === undefined || irData.data.pm25 < 0) w = -1;
          else if (irData.data.pm25 < 16) w = 0; // 0 ~ 15
          else if (irData.data.pm25 < 26) w = 1; // 16 ~ 25
          else if (irData.data.pm25 < 36) w = 2; // 26 ~ 35
          else w = 3; // 36 ~

          cmd_w = w;

          // CO2
          if (irData.data.co2 === undefined || irData.data.co2 < 0) w = -1;
          else if (irData.data.co2 < 501) w = 0; // 0 ~ 500
          else if (irData.data.co2 < 801) w = 1; // 501 ~ 800
          else if (irData.data.co2 < 1001) w = 2; // 801 ~ 1000
          else w = 3; // 1001 ~

          if (w > cmd_w) cmd_w = w;

          // VOC
          if (irData.data.voc === undefined || irData.data.voc < 0) w = -1;
          else if (irData.data.voc < 201) w = 0; // 0 ~ 200
          else if (irData.data.voc < 301) w = 1; // 201 ~ 300
          else if (irData.data.voc < 401) w = 2; // 301 ~ 400
          else w = 3; // 401 ~

          if (w > cmd_w) cmd_w = w;

          break;

        case "JNT":
        case "TAES":
          // PM2.5
          if (irData.data.pm25 === undefined || irData.data.pm25 < 0) w = -1;
          else if (irData.data.pm25 < 16) w = 0; // 0 ~ 15
          else if (irData.data.pm25 < 21) w = 1; // 16 ~ 20
          else if (irData.data.pm25 < 26) w = 2; // 21 ~ 25
          else if (irData.data.pm25 < 31) w = 3; // 26 ~ 30
          else if (irData.data.pm25 < 36) w = 4; // 31 ~ 35
          else if (irData.data.pm25 < 46) w = 5; // 36 ~ 45
          else w = 6; // 46 ~

          cmd_w = w;

          // CO2
          if (irData.data.co2 === undefined || irData.data.co2 < 0) w = -1;
          else if (irData.data.co2 < 501) w = 0; // 0 ~ 500
          else if (irData.data.co2 < 701) w = 1; // 501 ~ 700
          else if (irData.data.co2 < 801) w = 2; // 701 ~ 800
          else if (irData.data.co2 < 901) w = 3; // 801 ~ 900
          else if (irData.data.co2 < 1001) w = 4; // 901 ~ 1000
          else if (irData.data.co2 < 1201) w = 5; // 1001 ~ 1200
          else w = 6; // 1201 ~

          if (w > cmd_w) cmd_w = w;

          // VOC
          if (irData.data.voc === undefined || irData.data.voc < 0) w = -1;
          else if (irData.data.voc < 201) w = 0; // 0 ~ 200
          else if (irData.data.voc < 251) w = 1; // 201 ~ 250
          else if (irData.data.voc < 301) w = 2; // 251 ~ 300
          else if (irData.data.voc < 351) w = 3; // 301 ~ 350
          else if (irData.data.voc < 401) w = 4; // 351 ~ 400
          else if (irData.data.voc < 501) w = 5; // 401 ~ 500
          else w = 6; // 501 ~

          if (w > cmd_w) cmd_w = w;

          break;

        // NET KESR Model
        case "KESR":
          // PM2.5
          if (irData.data.pm25 === undefined || irData.data.pm25 < 0) w = -1;
          else if (irData.data.pm25 < 16) w = 0; // 0 ~ 15
          else if (irData.data.pm25 < 21) w = 1; // 16 ~ 20
          else if (irData.data.pm25 < 26) w = 2; // 21 ~ 25
          else if (irData.data.pm25 < 31) w = 3; // 26 ~ 30
          else if (irData.data.pm25 < 36) w = 4; // 31 ~ 35
          else if (irData.data.pm25 < 46) w = 5; // 36 ~ 45
          else w = 6; // 46 ~

          cmd_w = w;

          // CO2
          if (irData.data.co2 === undefined || irData.data.co2 < 0) w = -1;
          else if (irData.data.co2 < 501) w = 0; // 0 ~ 500
          else if (irData.data.co2 < 701) w = 1; // 501 ~ 700
          else if (irData.data.co2 < 801) w = 2; // 701 ~ 800
          else if (irData.data.co2 < 901) w = 3; // 801 ~ 900
          else if (irData.data.co2 < 1001) w = 4; // 901 ~ 1000
          else if (irData.data.co2 < 1201) w = 5; // 1001 ~ 1200
          else w = 6; // 1201 ~

          if (w > cmd_w) cmd_w = w;

          // VOC
          if (irData.data.voc === undefined || irData.data.voc < 0) w = -1;
          else if (irData.data.voc < 201) w = 0; // 0 ~ 200
          else if (irData.data.voc < 251) w = 1; // 201 ~ 250
          else if (irData.data.voc < 301) w = 2; // 251 ~ 300
          else if (irData.data.voc < 351) w = 3; // 301 ~ 350
          else if (irData.data.voc < 401) w = 4; // 351 ~ 400
          else if (irData.data.voc < 501) w = 5; // 401 ~ 500
          else w = 6; // 501 ~

          if (w > cmd_w) cmd_w = w;

          // cmd_m
          // 1: vent(default), 2: air, 3: bypass
          if (cmd_w > -1) {
            //debug('INFO: Get outer Info, irData.data=', irData.data);
            // Get Outer Info
            let uri = null;
            // Reference OAQ data
            if (data.ref_oaq !== undefined && data.ref_oaq !== null) {
              uri = "http://" + serverTable.kwKiotCluster.kiotdpd.address + "/v1/groups/kw-osk/" + data.ref_oaq;
            }
            // Reference KMA data
            else if (data.ref_dcode !== undefined && data.ref_dcode !== null) {
              uri = "http://" + serverTable.kwKiotCluster.kiotdpd.address + "/v1/sensors/kma-aq/" + data.ref_dcode;
            }
            //debug('INFO: Get outer Info, uri=', uri);

            let response, oaq_data, oaq_pm10, oaq_pm25, oaq_temp, oaq_humi;
            if (uri !== undefined && uri !== null) {
              try {
                response = await http.get(uri);
                oaq_data = JSON.parse(response).data;
                oaq_pm10 = oaq_data.pm10;
                oaq_pm25 = oaq_data.pm25;
                oaq_temp = oaq_data.temp;
                oaq_humi = oaq_data.humi;
                //debug('INFO: Get outer Info, oaq_data=', oaq_data);
              } catch (err) {
                debug("WARN: Failed to get Outer data:", err);
              }
            }

            // Check set_temp default value(24)
            if (data.set_temp === undefined || data.set_temp === null) {
              data.set_temp = 24;
            }

            // Check Data & Define Mode
            if (
              oaq_pm10 === undefined ||
              oaq_pm25 === undefined ||
              oaq_temp === undefined ||
              oaq_humi === undefined ||
              irData.data.temp === undefined ||
              irData.data.co2 === undefined ||
              irData.data.voc === undefined ||
              irData.data.pm10 === undefined ||
              irData.data.pm25 === undefined
            ) {
              cmd_m = 1; // vent mode(default)
            } else if (
              (oaq_pm10 >= 81 || oaq_pm25 >= 36 || oaq_temp < -15 || oaq_humi >= 95) &&
              irData.data.co2 < 1000 &&
              irData.data.voc < 400 &&
              irData.data.pm10 < 81 &&
              irData.data.pm25 < 36
            ) {
              cmd_m = 2; // air mode
            } else if (irData.data.temp - data.set_temp >= 2 && data.set_temp - oaq_temp >= 5 && data.set_temp - oaq_temp <= 10) {
              cmd_m = 3; // bypass mode
            } else {
              cmd_m = 1; // vent mode(default)
            }
            //debug('INFO: cmd_m=', cmd_m);
          }

          break;

        // NET Model
        case "HVAC":
          // PM2.5
          if (irData.data.pm25 === undefined || irData.data.pm25 < 0) w = -1;
          else if (irData.data.pm25 < 16) w = 0; // 0 ~ 15
          else if (irData.data.pm25 < 21) w = 1; // 16 ~ 20
          else if (irData.data.pm25 < 26) w = 2; // 21 ~ 25
          else if (irData.data.pm25 < 31) w = 3; // 26 ~ 30
          else if (irData.data.pm25 < 36) w = 4; // 31 ~ 35
          else if (irData.data.pm25 < 46) w = 5; // 36 ~ 45
          else w = 6; // 46 ~

          cmd_w = w;

          // CO2
          if (irData.data.co2 === undefined || irData.data.co2 < 0) w = -1;
          else if (irData.data.co2 < 501) w = 0; // 0 ~ 500
          else if (irData.data.co2 < 701) w = 1; // 501 ~ 700
          else if (irData.data.co2 < 801) w = 2; // 701 ~ 800
          else if (irData.data.co2 < 901) w = 3; // 801 ~ 900
          else if (irData.data.co2 < 1001) w = 4; // 901 ~ 1000
          else if (irData.data.co2 < 1201) w = 5; // 1001 ~ 1200
          else w = 6; // 1201 ~

          if (w > cmd_w) cmd_w = w;

          // VOC
          if (irData.data.voc === undefined || irData.data.voc < 0) w = -1;
          else if (irData.data.voc < 201) w = 0; // 0 ~ 200
          else if (irData.data.voc < 251) w = 1; // 201 ~ 250
          else if (irData.data.voc < 301) w = 2; // 251 ~ 300
          else if (irData.data.voc < 351) w = 3; // 301 ~ 350
          else if (irData.data.voc < 401) w = 4; // 351 ~ 400
          else if (irData.data.voc < 501) w = 5; // 401 ~ 500
          else w = 6; // 501 ~

          if (w > cmd_w) cmd_w = w;

          // cmd_m
          // 1: vent(default), 2: air, 3: bypass
          if (cmd_w > -1) {
            //debug('INFO: Get outer Info, irData.data=', irData.data);
            // Get Outer Info
            let uri = null;
            // Reference OAQ data
            if (data.ref_oaq !== undefined && data.ref_oaq !== null) {
              uri = "http://" + serverTable.kwKiotCluster.kiotdpd.address + "/v1/groups/kw-osk/" + data.ref_oaq;
            }
            // Reference KMA data
            else if (data.ref_dcode !== undefined && data.ref_dcode !== null) {
              uri = "http://" + serverTable.kwKiotCluster.kiotdpd.address + "/v1/sensors/kma-aq/" + data.ref_dcode;
            }
            //debug('INFO: Get outer Info, uri=', uri);

            let response, oaq_data, oaq_pm10, oaq_pm25, oaq_temp;
            if (uri !== undefined && uri !== null) {
              try {
                response = await http.get(uri);
                oaq_data = JSON.parse(response).data;
                oaq_pm10 = oaq_data.pm10;
                oaq_pm25 = oaq_data.pm25;
                oaq_temp = oaq_data.temp;
                //debug('INFO: Get outer Info, oaq_data=', oaq_data);
              } catch (err) {
                debug("WARN: Failed to get Outer data:", err);
              }
            }

            // Check set_temp default value(24)
            if (data.set_temp === undefined || data.set_temp === null) {
              data.set_temp = 24;
            }

            // mode
            // 01: 환기모드
            // 02: 바이패스모드
            // 03: 공기청정모드
            // 04: 냉방모드
            // 05: 냉방환기모드
            // 06: 난방모드
            // 07: 난방환기모드
            // 08: 제습모드
            // Check Data & Define Mode
            if (
              oaq_pm10 === undefined ||
              oaq_pm25 === undefined ||
              oaq_temp === undefined ||
              irData.data.temp === undefined ||
              irData.data.co2 === undefined ||
              irData.data.voc === undefined
            ) {
              cmd_m = 1; // 환기모드(default)
            } else if (irData.data.humi < 75) {
              if (irData.data.temp - data.set_temp < -2) {
                if ((oaq_pm10 >= 81 || oaq_pm25 >= 36) && irData.data.co2 < 1000 && irData.data.voc < 400) {
                  cmd_m = 6; // 난방모드
                } else {
                  cmd_m = 7; // 난방환기모드
                }
              } else if (irData.data.temp - data.set_temp <= 2) {
                if ((oaq_pm10 >= 81 || oaq_pm25 >= 36) && irData.data.co2 < 1000 && irData.data.voc < 400) {
                  cmd_m = 3; // 공기청정모드
                } else {
                  cmd_m = 1; // 환기모드
                }
              } else if (data.set_temp - oaq_temp >= 5 && data.set_temp - oaq_temp <= 15) {
                if ((oaq_pm10 >= 81 || oaq_pm25 >= 36) && irData.data.co2 < 1000 && irData.data.voc < 400) {
                  cmd_m = 4; // 냉방모드
                } else {
                  cmd_m = 2; // 바이패스모드
                }
              } else {
                if ((oaq_pm10 >= 81 || oaq_pm25 >= 36) && irData.data.co2 < 1000 && irData.data.voc < 400) {
                  cmd_m = 4; // 냉방모드
                } else {
                  cmd_m = 5; // 냉방환기모드
                }
              }
            } else {
              cmd_m = 8; // 제습모드
            }
          }

          break;
        case "KWV-ARC":
          if (irData.data.pm25 === undefined || irData.data.pm25 < 0) w = -1;
          let ai_mode = undefined;
          for (let i = 0; i < data.vent.length; i++) {
            if (data.vent[i].hasOwnProperty("ai_mode")) {
              ai_mode = data.vent[i].ai_mode;
            }
          }
          if (ai_mode) {
            if (ai_mode === 21) {
              //사무실
              if (irData.data.pm25 < 16.5) w = 0; // 0 ~ 16.5
              else if (irData.data.pm25 < 22) w = 1; // 16.5 ~ 22
              else if (irData.data.pm25 < 27.5) w = 2; // 22 ~ 27.5
              else if (irData.data.pm25 < 33) w = 3; // 27.5 ~ 33
              else if (irData.data.pm25 < 38.5) w = 4; // 33 ~ 38.5
              else if (irData.data.pm25 < 49.5) w = 5; // 38.5 ~ 49.5
              else if (irData.data.pm25 >= 49.5) w = 6; // 38.5 ~ 49.5
            } else if (ai_mode === 22) {
              // 학교
              if (irData.data.pm25 < 11.5) w = 0; // 0 ~ 11.5
              else if (irData.data.pm25 < 17) w = 1; // 11.5 ~ 17
              else if (irData.data.pm25 < 22.5) w = 2; // 17 ~ 22.5
              else if (irData.data.pm25 < 28) w = 3; // 22.5 ~ 28
              else if (irData.data.pm25 < 33.5) w = 4; // 28 ~ 33.5
              else if (irData.data.pm25 < 44.5) w = 5; // 33.5 ~ 44.5
              else if (irData.data.pm25 >= 44.5) w = 6; // 38.5 ~ 49.5
            } else if (ai_mode === 23) {
              // 체육관
              if (irData.data.pm25 < 8.5) w = 0; // 0 ~ 8.5
              else if (irData.data.pm25 < 13) w = 1; // 8.5 ~ 13
              else if (irData.data.pm25 < 17.5) w = 2; // 13 ~ 17.5
              else if (irData.data.pm25 < 22) w = 3; // 17.5 ~ 22
              else if (irData.data.pm25 < 26.5) w = 4; // 22 ~ 26.5
              else if (irData.data.pm25 < 35.5) w = 5; // 26.5 ~ 35.5
              else if (irData.data.pm25 >= 35.5) w = 6; // 38.5 ~ 49.5
            } else if (ai_mode === 24) {
              // 가정
              if (irData.data.pm25 < 16.5) w = 0; // 0 ~ 16.5
              else if (irData.data.pm25 < 22) w = 1; // 16.5 ~ 22
              else if (irData.data.pm25 < 27.5) w = 2; // 22 ~ 27.5
              else if (irData.data.pm25 < 33) w = 3; // 27.5 ~ 33
              else if (irData.data.pm25 < 38.5) w = 4; // 33 ~ 38.5
              else if (irData.data.pm25 < 49.5) w = 5; // 38.5 ~ 49.5
              else if (irData.data.pm25 >= 49.5) w = 6; // 38.5 ~ 49.5
            } else if (ai_mode === 25) {
              // 병원
              if (irData.data.pm25 < 10) w = 0; // 0 ~ 10
              else if (irData.data.pm25 < 15) w = 1; // 10 ~ 15
              else if (irData.data.pm25 < 20) w = 2; // 15 ~ 20
              else if (irData.data.pm25 < 25) w = 3; // 20 ~ 25
              else if (irData.data.pm25 < 30) w = 4; // 25 ~ 30
              else if (irData.data.pm25 < 40) w = 5; // 30 ~ 40
              else if (irData.data.pm25 >= 40) w = 6; // 38.5 ~ 49.5
            }

            cmd_w = w;

            if (irData.data.co2 === undefined || irData.data.co2 < 0) w = -1;
            if (ai_mode === 21) {
              //사무실
              if (irData.data.co2 < 400) w = 0; // 0 ~ 400
              else if (irData.data.co2 < 620) w = 1; // 400 ~ 620
              else if (irData.data.co2 < 730) w = 2; // 620 ~ 730
              else if (irData.data.co2 < 840) w = 3; // 730 ~ 840
              else if (irData.data.co2 < 950) w = 4; // 840 ~ 950
              else if (irData.data.co2 < 1170) w = 5; // 950 ~ 1170
              else if (irData.data.co2 >= 1170) w = 6;
            } else if (ai_mode === 22) {
              // 학교
              if (irData.data.co2 < 450) w = 0; // 0 ~ 450
              else if (irData.data.co2 < 670) w = 1; // 450 ~ 670
              else if (irData.data.co2 < 780) w = 2; // 670 ~ 780
              else if (irData.data.co2 < 890) w = 3; // 780 ~ 890
              else if (irData.data.co2 < 1000) w = 4; // 890 ~ 1000
              else if (irData.data.co2 < 1220) w = 5; // 1000 ~ 1220
              else if (irData.data.co2 >= 1220) w = 6;
            } else if (ai_mode === 23) {
              // 체육관
              if (irData.data.co2 < 450) w = 0; // 0 ~ 450
              else if (irData.data.co2 < 630) w = 1; // 450 ~ 630
              else if (irData.data.co2 < 720) w = 2; // 630 ~ 720
              else if (irData.data.co2 < 810) w = 3; // 720 ~ 810
              else if (irData.data.co2 < 900) w = 4; // 810 ~ 900
              else if (irData.data.co2 < 1080) w = 5; // 900 ~ 1080
              else if (irData.data.co2 >= 1080) w = 6;
            } else if (ai_mode === 24) {
              // 가정
              if (irData.data.co2 < 500) w = 0; // 500
              else if (irData.data.co2 < 720) w = 1; // 500 ~ 720
              else if (irData.data.co2 < 830) w = 2; // 720 ~ 830
              else if (irData.data.co2 < 940) w = 3; // 830 ~ 940
              else if (irData.data.co2 < 1050) w = 4; // 940 ~ 1050
              else if (irData.data.co2 < 1270) w = 5; // 1050 ~ 1270
              else if (irData.data.co2 >= 1270) w = 6;
            } else if (ai_mode === 25) {
              // 병원
              if (irData.data.co2 < 400) w = 0; // 0 ~ 400
              else if (irData.data.co2 < 600) w = 1; // 400 ~ 600
              else if (irData.data.co2 < 700) w = 2; // 600 ~ 700
              else if (irData.data.co2 < 800) w = 3; // 700 ~ 800
              else if (irData.data.co2 < 900) w = 4; // 800 ~ 900
              else if (irData.data.co2 < 1100) w = 5; // 900 ~ 1100
              else if (irData.data.co2 >= 1100) w = 6;
            }

            if (w > cmd_w) cmd_w = w;

            if (irData.data.voc === undefined || irData.data.voc < 0) w = -1;
            if (ai_mode === 21) {
              //사무실
              if (irData.data.voc < 220) w = 0; // 0 ~ 220
              else if (irData.data.voc < 275) w = 1; // 220 ~ 275
              else if (irData.data.voc < 330) w = 2; // 275 ~ 330
              else if (irData.data.voc < 385) w = 3; // 330 ~ 385
              else if (irData.data.voc < 440) w = 4; // 385 ~ 440
              else if (irData.data.voc < 550) w = 5; // 440 ~ 550
              else if (irData.data.voc >= 550) w = 6; //
            } else if (ai_mode === 22) {
              // 학교
              if (irData.data.voc < 195) w = 0; // 0 ~ 195
              else if (irData.data.voc < 250) w = 1; // 195 ~ 250
              else if (irData.data.voc < 305) w = 2; // 250 ~ 305
              else if (irData.data.voc < 360) w = 3; // 305 ~ 360
              else if (irData.data.voc < 415) w = 4; // 360 ~ 415
              else if (irData.data.voc < 525) w = 5; // 415 ~ 525
              else if (irData.data.voc >= 525) w = 6; //
            } else if (ai_mode === 23) {
              // 체육관
              if (irData.data.voc < 180) w = 0; // 0 ~ 180
              else if (irData.data.voc < 225) w = 1; // 180 ~ 225
              else if (irData.data.voc < 270) w = 2; // 225 ~ 270
              else if (irData.data.voc < 315) w = 3; // 270 ~ 315
              else if (irData.data.voc < 360) w = 4; // 315 ~ 360
              else if (irData.data.voc < 450) w = 5; // 360 ~ 450
              else if (irData.data.voc >= 550) w = 6; //
            } else if (ai_mode === 24) {
              // 가정
              if (irData.data.voc < 220) w = 0; // 220
              else if (irData.data.voc < 275) w = 1; // 220 ~ 275
              else if (irData.data.voc < 330) w = 2; // 275 ~ 330
              else if (irData.data.voc < 385) w = 3; // 330 ~ 385
              else if (irData.data.voc < 440) w = 4; // 385 ~ 440
              else if (irData.data.voc < 550) w = 5; // 440 ~ 550
              else if (irData.data.voc >= 550) w = 6; //
            } else if (ai_mode === 25) {
              // 병원
              if (irData.data.voc < 175) w = 0; // 0 ~ 175
              else if (irData.data.voc < 225) w = 1; // 175 ~ 225
              else if (irData.data.voc < 275) w = 2; // 225 ~ 270
              else if (irData.data.voc < 325) w = 3; //2 270 ~ 325
              else if (irData.data.voc < 375) w = 4; // 325 ~ 375
              else if (irData.data.voc < 475) w = 5; // 375 ~ 475
              else if (irData.data.voc >= 475) w = 6; //
            }
            if (w > cmd_w) cmd_w = w;
          }

          let oaquri = null;
          irData.data.deviceType = undefined;
          if (data.ref_oaq !== undefined && data.ref_oaq !== null) {
            oaquri = "http://" + serverTable.kwKiotCluster.kiotdpd.address + "/v1/groups/kw-osk/" + data.ref_oaq;
            irData.data.deviceType = 1;
          }
          // Reference KMA data
          else if (data.ref_dcode !== undefined && data.ref_dcode !== null) {
            oaquri = "http://" + serverTable.kwKiotCluster.kiotdpd.address + "/v1/sensors/kma-aq/" + data.ref_dcode;
            irData.data.deviceType = 2;
          }
          //debug('INFO: Get outer Info, uri=', uri);
          let oaq_response, oaq_data;
          if (oaquri !== undefined && oaquri !== null) {
            try {
              oaq_response = await http.get(oaquri);
              oaq_data = JSON.parse(oaq_response).data;
              irData.data.oaq_pm10 = oaq_data.pm10;
              irData.data.oaq_pm25 = oaq_data.pm25;
              irData.data.oaq_temp = oaq_data.temp;
              irData.data.oaq_humi = oaq_data.humi;
              //debug('INFO: Get outer Info, oaq_data=', oaq_data);
            } catch (err) {
              debug("WARN: Failed to get Outer data:", err);
            }
          }
          // Check set_temp default value(24)
          if (data.set_temp === undefined || data.set_temp === null) {
            data.set_temp = 24;
          }

          if (
            irData.data.oaq_pm10 === undefined ||
            irData.data.oaq_pm25 === undefined ||
            irData.data.oaq_temp === undefined ||
            irData.data.oaq_humi === undefined ||
            irData.data.temp === undefined ||
            irData.data.co2 === undefined ||
            irData.data.voc === undefined ||
            irData.data.pm10 === undefined ||
            irData.data.pm25 === undefined
          ) {
            cmd_m = 1; // vent mode(default)
          } else if (
            (irData.data.oaq_pm10 >= 81 || irData.data.oaq_pm25 >= 36 || irData.data.oaq_temp < -15 || irData.data.oaq_humi >= 95) &&
            irData.data.co2 < 1000 &&
            irData.data.voc < 400 &&
            irData.data.pm10 < 81 &&
            irData.data.pm25 < 36
          ) {
            cmd_m = 2; // air mode
          } else if (irData.data.temp - data.set_temp >= 2 && data.set_temp - irData.data.oaq_temp >= 5 && data.set_temp - irData.data.oaq_temp <= 10) {
            cmd_m = 3; // bypass mode
          } else {
            cmd_m = 1; // vent mode(default)
          }
          break;
        default:
          debug("WARN: IAQ-VENT undefined Model - ", data.vent[0].model);
          resolve();
          return;
      }

      if (cmd_w === -1) {
        throw new Error("No valid sensor data for IAQ-VENT control" + irData.service.deviceId);
      }

      resolve({
        cmd_w: cmd_w,
        cmd_p: cmd_w > 0 ? 1 : 0,
        cmd_m: cmd_m,
        ai_mode_devices: data.ai_mode_devices,
      });
    } catch (err) {
      debug("ERROR:", err.message);
      reject(err);
    }
  });
}

module.exports = {
  enrich: enrich,
};
