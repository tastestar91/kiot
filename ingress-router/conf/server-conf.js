"use strict";

const serverTable = {
  kwKiotCluster: {
    opentsdb: {
      address: ["10.100.100.100:24242"],
    },
    opentsdbWo: {
      address: ["10.100.100.101:24243"],
    },
    zookeeper: {
      address: ["kiot1:32181,kiot2:32181,kiot3:32181,kiot4:32181,kiot5:32181"],
    },
    redis: {
      address: ["kiot1:36379,kiot3:36379,kiot4:36379,kiot5:36379,kiot6:36379"],
    },
    kwall8_redis: {
      address: ["10.10.30.34:36379, 10.10.30.35:36379, 10.10.30.36:36379, 10.10.30.37:36379, 10.10.30.38:36379"],
    },
    mqtt: {
      address: ["kiot4:38616", "kiot5:38616", "kiot6:38616"],
    },
    kiotdpd: {
      address: ["10.10.30.10:30101"],
    },
  },
};

module.exports = {
  serverTable: serverTable,
};
