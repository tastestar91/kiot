"use strict";

const debug = require("debug")("ingress-router:preprocessor:prp-kw-oaq-sensor-kiot-enc-v1");
const base64 = require("64");
const sha256 = require("asmcrypto-lite").SHA256;

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
  "day_rainfall",
  "soil_moisture",
  "soil_temp",
  "radiation",
  "o2",
  "ch4",
  "h2s",
  "rn2",
  "visibility",
];

const fieldDelimiter = "&";

// Make a hash source string for a serial number
function getSerialHashSource(serial) {
  return serial + serial[8] + serial[9] + serial[6] + serial[7] + serial[2] + serial[3] + serial[0] + serial[1] + serial[4] + serial[5];
}

// Process K-Weather OAQ KIOT-encoded sensor data version 1
function preprocess(irData) {
  return new Promise((resolve, reject) => {
    try {
      // !hansu.chung: 서버 시간
      irData.service.timestamp = ~~(irData.service.timestamp / 60) * 60;

      // Decode data
      let dataList = base64.decode(Buffer.from(irData.service.apiUrlQuery)).toString().split(fieldDelimiter);

      // Check data integrity
      let digest = sha256.hex(getSerialHashSource(dataList[0]) + dataList[2] + dataList[4] + dataList.slice(6).join("")).toUpperCase();

      if (dataList[1] + dataList[3] + dataList[5] !== digest) {
        throw new Error("Wrong hash value: Hashed = " + digest);
      }

      // Process data
      irData.service.deviceId = dataList[0];

      let data = { tm: dataList[2] },
        valueIndex = 6;
      for (let i = 0; i < dataList[4].length; ++i) {
        if (dataList[4][i] === "1") {
          data[sensorFields[i]] = dataList[valueIndex++];
        }
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
