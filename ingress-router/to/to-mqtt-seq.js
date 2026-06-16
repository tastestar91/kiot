"use strict";

const debug = require("debug")("ingress-router:to:to-mqtt-seq");

const mqtt = require("../manager/man-mqtt");

async function wait(address, each, toConf) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      mqtt.publish(address, each.channel, each.data, toConf.forwarding.username, toConf.forwarding.password);
      resolve();
    }, 500);
  });
}

// Forward data to a MQTT broker in order
function forward(irData, toData, address, toConf) {
  return new Promise(async (resolve, reject) => {
    try {
      if (toConf.channel) {
        toData = [
          {
            channel: toConf.channel,
            data: typeof toData === "string" ? toData : JSON.stringify(toData),
          },
        ];
      }

      for (let i = 0; i < toData.length; ++i) {
        if (!toData[i].channel) {
          throw new Error("MQTT channel not specified: " + irData.service.id + ": " + irData.service.deviceId);
        }

        try {
          if (toData[i].channel[0].includes("kwv-arc/req/")) {
            await wait(address, toData[i].channel, toConf);
          }
          await mqtt.publish(address, toData[i].channel, toData[i].data, toConf.forwarding.username, toConf.forwarding.password);
        } catch (err) {
          throw new Error("[MQTT/PUB]: " + address + ": " + toData[i].channel + ": " + err.message);
        }
      }

      resolve();
    } catch (err) {
      debug("ERROR:", err);
      reject(err);
    }
  });
}

module.exports = {
  forward: forward,
};
