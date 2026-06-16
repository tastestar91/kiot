"use strict";

const debug = require("debug")("ingress-router:preprocessor:prp-kw-vent-sensor-kiot-enc-v1");
const base64 = require("64");
const sha256 = require("asmcrypto-lite").SHA256;

const sensorFields = [
  "auto_mode",
  "power",
  "air_volume",
  "op_mode",
  "filter_alarm",
  "sa_volume",
  "ea_volume",
  "sv_vsp1",
  "sv_vsp2",
  "sv_vsp3",
  "sv_vsp4",
  "sv_vsp5",
  "sv_vsp6",
  "ea_vsp1",
  "ea_vsp2",
  "ea_vsp3",
  "ea_vsp4",
  "ea_vsp5",
  "ea_vsp6",
  "pressure_base",
  "pressure_gap",
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
      let data = { reg_date: dataList[2] },
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
