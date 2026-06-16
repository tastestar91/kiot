"use strict";
const debug = require("debug")("ingress-router:preprocessor:prp-kw-oaq-ctl-kiot-plain-v1.js");

const sensorFields = ["Al", "Ti", "V", "Mn", "Fe", "Ni", "Co", "Cu", "Zn", "As", "Sr", "Mo", "Cd", "Ba", "Pb", "P", "S", "Cr", "Si"];

const fieldDelimiter = "&";

function unix_timestamp(time) {
  let timestamp = `${time} 00:00:00.000`;
  return Math.floor(new Date(timestamp).getTime() / 1000);
}

// Process K-Weather OAQ plain control data version 1
function preprocess(irData) {
  return new Promise((resolve, reject) => {
    try {
      let current = ~~(irData.service.timestamp / 60) * 60;
      let dataList = irData.service.apiUrlQuery.split(fieldDelimiter);
      irData.service.deviceId = dataList[0];
      irData.service.timestamp = unix_timestamp(dataList[1]);

      let valueIndex = 3,
        data = {
          serial: dataList[0],
          tm: current,
        };

      for (let i = 0; i < dataList[2].length; ++i) {
        if (dataList[2][i] === "1") {
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
