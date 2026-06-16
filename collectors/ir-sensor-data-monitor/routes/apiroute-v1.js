"use strict";

const debug = require("debug")("ir-sensor-data-monitor:routes:apiroute-v1");
const expressRouter = require("express").Router();

const airmap = require("../controller/airmap");

const memStore = require("../manager/man-memstore");
const groupManager = require("../updater/group-manager");
const zkUpdater = require("../updater/from-zk");
const redisSubUpdater = require("../updater/from-redis-sub");

const keyPrefix = "ir/v1/";

runUpdaters();

let errorMessage = { error: " NOT_FOUND_DATA" };

// Run Ingress-router sensor data and configuration updaters
async function runUpdaters() {
  try {
    // Run a from-zk sensor data updater
    try {
      await zkUpdater.update();
    } catch (err) {
      debug("ERROR:", err); // Ignore an error
    }

    // Load test sensor data for debugging
    groupManager.loadTestSensorData();

    // Start group configuration updates
    await groupManager.startConfUpdate();

    // Start merge configuration updates
    await redisSubUpdater.startConfUpdate();

    // Run a from-redis-sub sensor data updater
    await redisSubUpdater.update();
  } catch (err) {
    debug("ERROR:", err);
    process.exit(1);
  }
}

// Express-ws message handler
function wsMessageHandler(ws, req, msg) {
  // TODO: WebSocket support
}

expressRouter.get("/services/kw-kgkw1", airmap.areaData);

expressRouter.get("/:api/:sid/:aid/:did", (req, res, next) => {
  try {
    let data = memStore.get(keyPrefix + req.params.api)[req.params.sid];
    if (data[req.params.aid][req.params.did]) res.json(data[req.params.aid][req.params.did]);
    else throw new Error("Not found");
  } catch (err) {
    res.status(404).json(errorMessage);
    debug("ERROR: GET %s%s: %s", req.baseUrl, req.path, err.message);
  }
});

// Express router
expressRouter.get("/:api/:sid/:did", (req, res, next) => {
  try {
    let data = memStore.get(keyPrefix + req.params.api)[req.params.sid];
    if (data[req.params.did]) res.json(data[req.params.did]);
    else throw new Error("Not found");
  } catch (err) {
    res.status(404).json(errorMessage);
    debug("ERROR: GET %s%s: %s", req.baseUrl, req.path, err.message);
  }
});

expressRouter.get("/:api/:sid", (req, res, next) => {
  try {
    let data = memStore.get(keyPrefix + req.params.api)[req.params.sid];
    if (data) res.json(data);
    else throw new Error("Not found");
  } catch (err) {
    res.status(404).json(errorMessage);
    debug("ERROR: GET %s%s: %s", req.baseUrl, req.path, err.message);
  }
});

expressRouter.get("/:api", async (req, res, next) => {
  try {
    let data = memStore.get(keyPrefix + req.params.api);
    if (data) res.json(data);
    else throw new Error("Not found");
  } catch (err) {
    res.status(404).json(errorMessage);
    debug("ERROR: GET %s%s: %s", req.baseUrl, req.path, err.message);
  }
});

// TODO: WebSocket support
/*
expressRouter.ws('/sensors/:sid', (ws, req) => {
	ws.on('message', (msg) => wsMessageHandler(ws, req, msg));
});
*/

expressRouter.use((req, res, next) => res.sendStatus(404));

module.exports = expressRouter;
