"use strict";

const debug = require("debug")("ingress-router:converter:cvt-kw-sensor-v1-cmd-vent");
const memStoreRedis = require("../manager/man-memstore-redis");

const keyPrefix = "kw/iaq/cmd/v1/";

// Calculate a Modulo 256 checksum (8 bits)
function checksumModulo256(str) {
  let buf = Buffer.from(str, "ascii"),
    sum = 0;

  for (let i = 0; i < buf.length; ++i) {
    sum = (sum + buf[i]) % 256;
  }

  return sum.toString(16).toUpperCase();
}

// Generate K-Weather VENT command list
function convert(irData, toData, toConf) {
  return new Promise(async (resolve, reject) => {
    try {
      let iaqData = await memStoreRedis.get(keyPrefix + irData.service.deviceId);
      if (!iaqData || iaqData.vent.length < 1) {
        debug("No IAQ status data for VENT control:", irData.service.deviceId);
        resolve();
        return;
      }

      toData = [];
      let cmdList;

      for (let i = 0; i < iaqData.vent.length; ++i) {
        cmdList = null;
        try {
          if (irData.data.cmd_w === undefined || !iaqData.vent[i].ai_mode) {
            switch (iaqData.vent[i].model) {
              case "JNT": // Model: JNT
              case "AHU": // Model: AHU
              case "KWG-ST1": // Model: KWG-ST1
              case "KWV-AIC1": // Model: KWV-AIC1
                break;

              case "TAES": // Model: TAES
              case "KESR": // Model: KESR
                if (irData.data.pm25 !== undefined && irData.data.co2 !== undefined) {
                  cmdList = ["DATA" + String(irData.data.pm25).padStart(5, "0") + String(irData.data.co2).padStart(5, "0")];
                }

                break;

              case "KWV-ARC":
                if (irData.data.oaq_pm25 !== undefined && irData.data.deviceType !== undefined) {
                  let pm10,
                    pm25,
                    temp,
                    humi = undefined;
                  let { deviceType, tm, oaq_pm25, oaq_pm10, oaq_temp, oaq_humi } = irData.data;
                  pm10 = String(oaq_pm10).padStart(5, "0");
                  pm25 = String(oaq_pm25).padStart(5, "0");
                  temp = String((oaq_temp + 100) * 10).padStart(4, "0");
                  humi = String(Math.floor(oaq_humi)).padStart(3, "0");
                  cmdList = [`COAQ${deviceType}${tm}${pm25}${pm10}${temp}${humi}`];
                }
                break;
              default:
                debug("ERROR: Unsupported VENT model:", iaqData.vent[i].model);
                continue;
            }
          } else {
            switch (iaqData.vent[i].model) {
              case "JNT": // Model: JNT
                if (irData.data.cmd_w === 0) {
                  cmdList = ["CMDP0"];
                } else {
                  cmdList = ["CMDP1", "CMDW" + irData.data.cmd_w];
                }

                break;

              case "TAES": // Model: TAES
                if (irData.data.cmd_w === 0) {
                  cmdList = ["CCMDA1P0"];
                } else {
                  cmdList = ["CCMDA1W" + irData.data.cmd_w];
                }

                if (irData.data.pm25 !== undefined && irData.data.co2 !== undefined) {
                  cmdList.push("DATA" + String(irData.data.pm25).padStart(5, "0") + String(irData.data.co2).padStart(5, "0"));
                }

                break;

              case "KWV-AIC1": // Model: KWV-AIC1
                if (irData.data.cmd_w === 0) {
                  cmdList = ["CCMDA1P0"];
                } else {
                  cmdList = ["CCMDA1W" + irData.data.cmd_w];
                }

                break;

              case "AHU": // Model: AHU
                if (irData.data.cmd_w === 0) {
                  cmdList = ["CCMDA100"];
                } else {
                  cmdList = ["CCMDA1W" + irData.data.cmd_w];
                }

                break;

              case "KWG-ST1": // Model: KWG-ST1
                if (irData.data.cmd_w === 0) {
                  cmdList = ["CCMDA1P0"];
                } else {
                  cmdList = ["CCMDA1W" + irData.data.cmd_w];
                }

                break;
              // NET Model
              case "KESR": // Model: KESR
                if (irData.data.cmd_w === 0) {
                  cmdList = ["CCMDA" + irData.data.cmd_m + "P0"];
                } else {
                  cmdList = ["CCMDA" + irData.data.cmd_m + "W" + irData.data.cmd_w];
                }

                if (irData.data.pm25 !== undefined && irData.data.co2 !== undefined) {
                  cmdList.push("DATA" + String(irData.data.pm25).padStart(5, "0") + String(irData.data.co2).padStart(5, "0"));
                }

                break;

              // HVAC Model
              case "HVAC":
                if (irData.data.cmd_w === 0) {
                  cmdList = ["CCMDA" + irData.data.cmd_m + "P0"];
                } else {
                  cmdList = ["CCMDA" + irData.data.cmd_m + "H" + irData.data.cmd_m];
                }

                if (irData.data.pm25 !== undefined && irData.data.co2 !== undefined) {
                  cmdList.push("DATA" + String(irData.data.pm25).padStart(5, "0") + String(irData.data.co2).padStart(5, "0"));
                }

                break;
              case "KWV-ARC":
                if (iaqData.vent[i].ai_mode.toString().indexOf(2) !== -1) {
                  cmdList = [`CCTLA2U0S${iaqData.vent[i].ai_mode - 20}PXW${irData.data.cmd_w}E${irData.data.cmd_w}H${irData.data.cmd_m}`];
                }

                if (irData.data.oaq_pm25 !== undefined && irData.data.deviceType !== undefined) {
                  let pm10,
                    pm25,
                    temp,
                    humi = undefined;
                  if (cmdList !== null) {
                    let { deviceType, tm, oaq_pm25, oaq_pm10, oaq_temp, oaq_humi } = irData.data;
                    pm10 = String(oaq_pm10).padStart(5, "0");
                    pm25 = String(oaq_pm25).padStart(5, "0");
                    temp = String((oaq_temp + 100) * 10).padStart(4, "0");
                    humi = String(Math.floor(oaq_humi)).padStart(3, "0");
                    cmdList.push(`COAQ${deviceType}${tm}${pm25}${pm10}${temp}${humi}`);
                  } else {
                    let { deviceType, tm, oaq_pm25, oaq_pm10, oaq_temp, oaq_humi } = irData.data;
                    pm10 = String(oaq_pm10).padStart(5, "0");
                    pm25 = String(oaq_pm25).padStart(5, "0");
                    temp = String((oaq_temp + 100) * 10).padStart(4, "0");
                    humi = String(Math.floor(oaq_humi)).padStart(3, "0");
                    cmdList = [`COAQ${deviceType}${tm}${pm25}${pm10}${temp}${humi}`];
                  }
                }
                break;

              default:
                debug("ERROR: Unsupported VENT model:", iaqData.vent[i].model);
                continue;
            }
          }

          if (!cmdList) {
            debug("No cmdList for VENT control:", irData.service.deviceId);
            //resolve();
            //return;
            continue;
          }
          // Publish NET Command to MQTT
          for (let j = 0; j < cmdList.length; ++j) {
            toData.push({
              channel: [iaqData.vent[i].channel.req],
              data: cmdList[j] + checksumModulo256(cmdList[j]).slice(-1) + "=",
            });
          }
        } catch (err) {
          debug("ERROR: %s: %s", irData.service.deviceId, err.message);
        }
      }

      if (toData.length < 1) {
        debug("No IAQ VENT CMD control:", irData.service.deviceId);
        resolve();
        return;
      }

      resolve(toData);
    } catch (err) {
      debug("ERROR: %s: %s: %s", irData.service.id, irData.service.deviceId, err);
      reject(err);
    }
  });
}

module.exports = {
  convert: convert,
};
