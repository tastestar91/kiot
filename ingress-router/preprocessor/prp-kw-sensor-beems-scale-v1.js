"use strict";

const debug = require("debug")("ingress-router:preprocessor:prp-kw-sensor-beems-scale-v1");

// K-Weather sensor data scaling version 1
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
            case "watt":
              irData.data[sensor] = Number(irData.data[sensor]);
              irData.data["ToE"] = Math.floor(irData.data[sensor] * 0.000229 * 1000000) / 1000000; // 전력사용량(kWh) × 0.000229 ToE
              irData.data["tCO2eq"] = Math.floor(irData.data[sensor] * 0.0005 * 10000) / 10000; // 전력사용량(kWh) × 0.0005 tCO2eq
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

      if (irData.data.pm10_raw !== undefined) {
        irData.data.pm10 = irData.data.pm10_raw;
      }

      if (irData.data.pm25_raw !== undefined) {
        irData.data.pm25 = irData.data.pm25_raw;
      }

      if (irData.data.pm01_raw !== undefined) {
        irData.data.pm01 = irData.data.pm01_raw;
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
