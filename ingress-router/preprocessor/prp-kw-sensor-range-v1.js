"use strict";

const debug = require("debug")("ingress-router:preprocessor:prp-kw-sensor-range-v1");

// K-Weather sensor data range version 1 - 2022-03-21
function preprocess(irData) {
  return new Promise((resolve, reject) => {
    try {
      let orgValue;

      for (let sensor in irData.data) {
        if (irData.data[sensor] === undefined) continue;

        if (irData.data[sensor] === "") {
          irData.data[sensor] = undefined;
          continue;
        }

        orgValue = irData.data[sensor];

        try {
          switch (sensor) {
            case "temp": //온도 허용범위
            case "wbgt": //흑구온도 허용범위
              if (irData.data[sensor] < -60) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 80) {
                irData.data[sensor] = 80;
              }
              break;
            case "humi": //습도 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 100) {
                irData.data[sensor] = 100;
              }
              break;
            case "co2": //이산화탄소 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 10000) {
                irData.data[sensor] = 10000;
              }
              break;
            case "voc": //휘발성유기화합물 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 60000) {
                irData.data[sensor] = 60000;
              }
              break;
            case "noise": //소음 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] < 30) {
                irData.data[sensor] = 30;
              } else if (irData.data[sensor] > 95) {
                irData.data[sensor] = 95;
              }
              break;
            case "windd": //풍향 허용범위
            case "windd_max": //돌풍풍향 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 360) {
                irData.data[sensor] = 360;
              }
              break;
            case "winds": //풍속 허용범위
            case "winds_max": //돌풍풍속 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 100) {
                irData.data[sensor] = 100;
              }
              break;
            case "lux": //조도 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 120000) {
                irData.data[sensor] = 120000;
              }
              break;
            case "uv": //자외선 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 16) {
                irData.data[sensor] = 16;
              }
              break;
            case "accx": //진동x 허용범위
            case "accx_max": //진동x_최대 허용범위
            case "accy": //진동y 허용범위
            case "accy_max": //진동y_최대 허용범위
            case "accz": //진동z 허용범위
            case "accz_max": //진동z_최대 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 16) {
                irData.data[sensor] = 16;
              }
              break;
            case "co": //일산화탄소 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 1000) {
                irData.data[sensor] = 1000;
              }
              break;
            case "hcho": //포름알데히드 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 1340) {
                irData.data[sensor] = 1340;
              }
              break;
            case "o2": //산소 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 25) {
                irData.data[sensor] = 25;
              }
              break;
            case "o3": //오존 허용범위
            case "no2": //이산화질소 허용범위
            case "so2": //이산화황 허용범위
            case "nh3": //암모니아 허용범위
            case "h2s": //황화수소 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 100) {
                irData.data[sensor] = 100;
              }
              break;
            case "rn": //라돈 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 3000) {
                irData.data[sensor] = 3000;
              }
              break;
            case "atm": //기압 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] < 300) {
                irData.data[sensor] = 300;
              } else if (irData.data[sensor] > 1100) {
                irData.data[sensor] = 1100;
              }
              break;
            case "rainfall": //강수량 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 1000) {
                irData.data[sensor] = 1000;
              }
              break;
            case "day_rainfall": //일 강수량 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 10000) {
                irData.data[sensor] = 10000;
              }
              break;
            case "radiation": // 일사량 허용범위
              if (irData.data[sensor] < 0) {
                delete irData.data[sensor];
              } else if (irData.data[sensor] > 0.12) {
                irData.data[sensor] = 0.12;
              }
              break;
            case "gps_lat": //위도 허용범위 없음
            case "gps_lon": //경도 허용범위 없음
              break;

            default:
              irData.data[sensor] = Number(irData.data[sensor]);
              break;
          }

          if (Number.isNaN(irData.data[sensor])) {
            irData.data[sensor] = undefined;
            throw new TypeError("Invalid data value");
          }
        } catch (err) {
          debug("ERROR: %s: %s = %s", err.message, sensor, orgValue);
        }
      }

      // Edited by hansu.chung
      if (irData.data.pm10 !== undefined) {
        if (irData.data.pm10 < 0) {
          //미세먼지 허용범위 하한값
          irData.data.pm10_raw = undefined;
          delete irData.data.pm10;
        } else if (irData.data.pm10 > 5000) {
          //미세먼지 허용범위 상한값
          irData.data.pm10_raw = 5000;
          irData.data.pm10 = 5000;
        }
      }

      if (irData.data.pm25 !== undefined) {
        if (irData.data.pm25 < 0) {
          //초미세먼지 허용범위 하한값
          irData.data.pm25_raw = undefined;
          delete irData.data.pm25;
        } else if (irData.data.pm25 > 5000) {
          //초미세먼지 허용범위 상한값
          irData.data.pm25_raw = 5000;
          irData.data.pm25 = 5000;
        }
      }

      if (irData.data.pm01 !== undefined) {
        if (irData.data.pm01 < 0) {
          //극초미세먼지 허용범위 하한값
          irData.data.pm01_raw = undefined;
          delete irData.data.pm01;
        } else if (irData.data.pm01 > 5000) {
          //극초미세먼지 허용범위 상한값
          irData.data.pm01_raw = 5000;
          irData.data.pm01 = 5000;
        }
      }

      resolve(irData);
    } catch (err) {
      debug("ERROR:", err.message);
      reject(err);
    }
  });
}

module.exports = {
  preprocess: preprocess,
};
