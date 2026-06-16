"use strict";

const debug = require("debug")("ingress-router:preprocessor:prp-kw-sensor-scale-v1");

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
            case "temp":
            case "wbgt":
              irData.data[sensor] = Math.round((irData.data[sensor] / 10 - 100) * 10) / 10;
              break;

            case "windd":
            case "windd_max":
            case "winds":
            case "winds_max":
            case "uv":
            case "atm":
            case "rainfall":
            case "day_rainfall":
              irData.data[sensor] /= 10;
              break;

            case "accx":
            case "accx_max":
            case "accy":
            case "accy_max":
            case "accz":
            case "accz_max":
            case "o2":
              irData.data[sensor] /= 100;
              break;

            case "co":
            case "o3":
            case "no2":
            case "so2":
            case "nh3":
            case "h2s":
              irData.data[sensor] /= 1000;
              break;

            case "hcho":
              irData.data[sensor] = Math.floor(irData.data[sensor] * 1.34 * 10) / 10;
              break;

            case "gps_lat":
            case "gps_lon":
              irData.data[sensor] = Math.floor(irData.data[sensor] / 1000000) + Math.floor(((irData.data[sensor] % 1000000) / 10000 / 60) * 100000) / 100000;
              break;
            case "radiation":
              irData.data[sensor] /= 1000000;
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
