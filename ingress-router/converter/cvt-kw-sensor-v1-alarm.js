"use strict";

const debug = require("debug")("ingress-router:converter:cvt-kw-sensor-v1-alarm");
const confIr = require("../conf/config").ingressRouter;

const alarmChannel = confIr.alarm_redis.alarmChannel.put;

function makeToData(irData) {
  return {
    key: alarmChannel + irData.service.deviceId,
    value: JSON.stringify({
      id: irData.service.id,
      timestamp: irData.service.timestamp,
      deviceId: irData.service.deviceId,
      pm10: irData.data["pm10"] || undefined,
      pm25: irData.data["pm25"] || undefined,
      co2: irData.data["co2"] || undefined,
      voc: irData.data["voc"] || undefined,
    }),
  };
}

// Generate K-Weather IAQ sensor and IAQ-VENT data list
function convert(irData, toData, toConf) {
  return new Promise(async (resolve, reject) => {
    try {
      // 데이터시간 체크한다면 여기
      // pm25 75 pm10 100 co2 1500 voc 1000 이 넘으면 toData에 push 한다
      let { pm10, pm25, co2, voc } = irData.data;
      if (pm25 > 75 || pm10 > 100 || co2 > 1500 || voc > 100) {
        if (!toData) {
          toData = [makeToData(irData)];
        } else {
          toData.push(makeToData(irData));
        }
      } else {
        resolve(toData);
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
