"use strict";

const debug = require("debug")("ingress-router:manager:man-kwall8-redis");
const Redis = require("ioredis");

const moduleManager = require("./module-manager");

const redisPubServerMap = new Map();
const redisSubServerMap = new Map();
const redisSubChannelHandlerMap = new Map();

const redisConnectionTimeout = 5000;

const defaultNodeOptions = {
  keepAlive: 10000,
  noDelay: false,
  dropBufferSupport: true,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
  password: "",
};

const defaultClusterOptions = {
  enableOfflineQueue: true,
  enableReadyCheck: true,
  scaleReads: "master",
  maxRedirections: 16, // 다른 노드로 명령 리다이렉션
  retryDelayOnFailover: 100, //재시도
  retryDelayOnClusterDown: 100, // 지정된 시간 후에 명령 다시보냄
  retryDelayOnTryAgain: 100, //오류로 거부하게된 명령 다시 보냄
  redisOptions: defaultNodeOptions,
};

moduleManager.registerModuleReleaseHandler(release);

// Generate the address list of Redis cluster nodes
function getClusterAddressList(addressStr) {
  let addressInfo,
    addressList = [];
  for (let address of addressStr.split(",")) {
    addressInfo = address.trim().split(":");
    addressList.push({ port: addressInfo[1], host: addressInfo[0] });
  }
  return addressList;
}

// Connect a Redis server
function connect(address, serverMap, /* [optional] */ password) {
  return new Promise((resolve, reject) => {
    let rejectTimeoutHandle;

    try {
      // If there exists a valid connection, return the connection
      let redis = serverMap.get(address);
      if (redis) {
        resolve(redis);
        return;
      }

      // If there exists no valid connection, create a new connection
      rejectTimeoutHandle = moduleManager.enableRejectTimeout(reject, redisConnectionTimeout, new Error("Connection timeout"));

      let addressList = getClusterAddressList(address);
      if (password) {
        let nodeOptions = defaultNodeOptions;
        nodeOptions.password = password;
        let clusterOptions = defaultClusterOptions;
        clusterOptions.redisOptions = nodeOptions;
        redis = new Redis.Cluster(addressList, clusterOptions);
      } else {
        redis = new Redis.Cluster(addressList, defaultClusterOptions);
      }

      redis.on("error", () => {
        debug("ERROR: [KWALL8-Redis/CLUSTER_ERROR]: %o (%o)", address, redis.status);
      });
      redis.on("connect", () => {
        clearTimeout(rejectTimeoutHandle);

        let rd = serverMap.get(address);
        if (rd) {
          resolve(rd);
          redis.disconnect();
        } else {
          serverMap.set(address, redis);
          resolve(redis);
          debug("Connected to Redis: %o (%o)", address, redis.status);
        }
      });
    } catch (err) {
      if (rejectTimeoutHandle) clearTimeout(rejectTimeoutHandle);
      debug("ERROR:", err);
      reject(err);
    }
  });
}

// Release all resources
function release() {
  for (let serverMap of [redisPubServerMap, redisSubServerMap]) {
    for (let redis of serverMap.values()) {
      if (redis) {
        try {
          redis.disconnect();
        } catch (err) {
          debug("ERROR:", err);
        }
      }
    }
    serverMap.clear();
  }
}

// Get Redis data
function get(address, key, /* [optional] */ password) {
  return new Promise(async (resolve, reject) => {
    try {
      let redis = await connect(address, redisSubServerMap, password);
      redis.get(key, (err, result) => {
        if (err) {
          debug("ERROR: [KWALL8-Redis/GET]: %s: %s: %s", address, key, err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    } catch (err) {
      debug("ERROR: [KWALL8-Redis/GET]: %s: %s: %s", address, key, err);
      reject(err);
    }
  });
}

// Set Redis data
function set(address, key, data, /* [optional] */ password) {
  return new Promise(async (resolve, reject) => {
    try {
      let redis = await connect(address, redisPubServerMap, password);
      redis.set(key, data, (err, result) => {
        if (err) {
          debug("ERROR: [KWALL8-Redis/SET]: %s: %s: %s", address, key, err);
          reject(err);
        } else {
          debug("SUCCESS: [KWALL8-Redis/SET]: %s: %s", address, key);
          resolve(result);
        }
      });
    } catch (err) {
      debug("ERROR: [KWALL8-Redis/SET]: %s: %s: %s", address, key, err);
      reject(err);
    }
  });
}

module.exports = {
  get: get,
  set: set,
};
