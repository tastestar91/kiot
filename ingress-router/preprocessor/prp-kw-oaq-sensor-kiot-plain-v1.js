"use strict";

const debug = require("debug")("ingress-router:preprocessor:prp-kw-oaq-sensor-kiot-plain-v1");

const sensorFields = [
  "pm01_raw",
  "pm25_raw",
  "pm10_raw",
  "temp",
  "humi",
  "co2",
  "voc",
  "noise",
  "windd",
  "windd_max",
  "winds",
  "winds_max",
  "lux",
  "uv",
  "accx",
  "accx_max",
  "accy",
  "accy_max",
  "accz",
  "accz_max",
  "wbgt",
  "co",
  "hcho",
  "o3",
  "rn",
  "no2",
  "so2",
  "atm",
  "rain",
  "nh3",
  "h2s",
  "gps_lat",
  "gps_lon",
  "rainfall",
];

const fieldDelimiter = "&";

// Process K-Weather OAQ plain sensor data version 1
function preprocess(irData) {
  return new Promise((resolve, reject) => {
    try {
      irData.service.timestamp = ~~(irData.service.timestamp / 60) * 60;

      let dataList = irData.service.apiUrlQuery.split(fieldDelimiter);
      irData.service.deviceId = dataList[0];

      let data = { tm: dataList[1] },
        valueIndex = 3;
      for (let i = 0; i < dataList[2].length; ++i) {
        if (dataList[2][i] === "1") {
          data[sensorFields[i]] = dataList[valueIndex++];
        }
      }

      // kw-iskp1 + kw-iske1, kw-oskp1 + kw-oske1 통합
      if (irData.service.id === "kw-iskp1") {
        irData.service.id = "kw-iske1";
      } else if (irData.service.id === "kw-oskp1") {
        irData.service.id = "kw-oske1";
      }

      irData.data = data;
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
