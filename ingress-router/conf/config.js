"use strict";

// Development version?
const dev = false;

const ingressRouter = {
  port: dev ? 40002 : 40001,
  unixDomainSocket: dev ? "/tmp/ingress-router-dev.sock" : "/tmp/ingress-router.sock",
  infoTableMonitorInterval: 5000,
  memStore: {
    redisKeyPrefix: dev ? "ingress-router-dev/v1/memstore:" : "ingress-router/v1/memstore:",
  },
  zookeeper: {
    quorum: "kiot1:32181,kiot2:32181,kiot3:32181,kiot4:32181,kiot5:32181",
    monitorPath: {
      sensors: dev ? "/ingress-router-dev/v1/monitor/sensors" : "/ingress-router/v1/monitor/sensors",
    },
  },
  redis: {
    address: "kiot1:36379,kiot3:36379,kiot4:36379,kiot5:36379,kiot6:36379",
    password: undefined,
    sensorDataChannel: {
      get: dev ? "ingress-router-dev/v1/sensors.get:" : "ingress-router/v1/sensors.get:",
    },
    memStoreChannel: {
      put: dev ? "ingress-router-dev/v1/memstore.put:" : "ingress-router/v1/memstore.put:",
    },
    enricherChannel: {
      get: dev ? "ingress-router-dev/v1/enrichers.get:" : "ingress-router/v1/enrichers.get:",
    },
    postprocessorChannel: {
      get: dev ? "ingress-router-dev/v1/postprocessor.get:" : "ingress-router/v1/postprocessor.get:",
    },
  },
  alarm_redis: {
    address: "10.10.30.34:36379, 10.10.30.35:36379, 10.10.30.36:36379, 10.10.30.37:36379, 10.10.30.38:36379",
    password: "zpdliot1!",
    alarmChannel: {
      put: dev ? "ingress-router-dev/v1/alarm:" : "ingress-router/v1/alarm:",
    },
  },
};

module.exports = {
  ingressRouter: ingressRouter,
};
