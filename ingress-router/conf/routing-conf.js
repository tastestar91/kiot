"use strict";
// jenkins test2
const serverTable = require("./server-conf").serverTable;

const routingTable = {
  confs: [
    {
      id: ["kw-iskp1"], // kw-iaq-sensor-kiot-plain-v1
      preprocessor: ["kw-oaq-sensor-kiot-plain-v1", "kw-sensor-scale-v1", "kw-sensor-range-v1"],
      enricher: ["kw-sensor-cici-v2", "kw-sensor-cmd-iaqvent-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-iaq-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb-iaq-vent"],
          metric: "kw-iaq-vent-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          converter: ["kw-sensor-v1-pub-sensor-vent"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
        {
          type: "mqtt-seq",
          converter: ["kw-sensor-v1-pub-vent-cmd"],
          forwarding: {
            loadBalancing: "rr",
            address: serverTable.kwKiotCluster.mqtt.address,
          },
        },
      ],
      postprocessor: ["kw-sensor-v1-response", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-iske1"], // kw-iaq-sensor-kiot-enc-v1
      preprocessor: ["kw-oaq-sensor-kiot-enc-v1", "kw-sensor-scale-v1", "kw-sensor-range-v1"],
      enricher: ["kw-sensor-cici-v2", "kw-sensor-cmd-iaqvent-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-iaq-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb-iaq-vent"],
          metric: "kw-iaq-vent-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          converter: ["kw-sensor-v1-pub-sensor-vent"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
        {
          type: "kwall8-redis",
          converter: ["kw-sensor-v1-alarm"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.kwall8_redis.address,
          },
        },
        {
          type: "mqtt-seq",
          converter: ["kw-sensor-v1-pub-vent-cmd"],
          forwarding: {
            loadBalancing: "rr",
            address: serverTable.kwKiotCluster.mqtt.address,
          },
        },
      ],
      postprocessor: ["kw-sensor-v1-response", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-oskp1"], // kw-oaq-sensor-kiot-plain-v1
      preprocessor: ["kw-oaq-sensor-kiot-plain-v1", "kw-sensor-scale-v1", "kw-sensor-range-v1"],
      enricher: ["kw-sensor-pm-oaq-v1", "kw-sensor-coci-v2"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-oaq-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/oaq/sensor/kiot"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-sensor-v1-response", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-oske1"], // kw-oaq-sensor-kiot-enc-v1
      preprocessor: ["kw-oaq-sensor-kiot-enc-v1", "kw-sensor-scale-v1", "kw-sensor-range-v1"],
      enricher: ["kw-sensor-pm-oaq-v1", "kw-sensor-coci-v2"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-oaq-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/oaq/sensor/kiot"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-sensor-v1-response", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-oske1-jeju"], // kw-oaq-sensor-kiot-enc-v1-jeju
      preprocessor: ["kw-oaq-sensor-kiot-enc-v1", "kw-sensor-scale-v1"],
      enricher: ["kw-sensor-pm-oaq-v1", "kw-sensor-coci-v2"],
      monitor: ["kw-sensor-v1-1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-oaq-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/oaq/sensor/kiot"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
        {
          type: "http-server",
          converter: ["ir-httpserver-forward-jeju"],
          forwarding: {
            loadBalancing: "none",
            address: ["211.57.121.14:8889/api/collection/data/iot/insert"],
            //address: ["112.164.247.70:8889/api/collection/data/iot/insert"],            
          },
        },
      ],
      postprocessor: ["kw-sensor-v1-response", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-oskp1-oot"], // kw-oaq-sensor-kiot-plain-v1-oot
      preprocessor: ["kw-oaq-sensor-oot-plain-v1"],
      enricher: ["kw-sensor-coci-v2"],
      monitor: ["kw-sensor-v1-1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-oaq-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/oaq/sensor/kiot"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-osde1"], // kw-oaq-sensor-dot-enc-v1
      preprocessor: ["kw-oaq-sensor-dot-enc-v1", "kw-sensor-scale-v1"],
      enricher: ["kw-sensor-pm-oaq-v1", "kw-sensor-coci-v2"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-oaq-sensor-dot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/oaq/sensor/dot"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-sensor-v1-response-dot", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-osde1-1"], // kw-oaq-sensor-dot-enc-v1-1 (sdot renewal: n_connect)
      preprocessor: ["kw-oaq-sensor-dot-enc-v1-1", "kw-sensor-scale-v1"],
      enricher: ["kw-sensor-pm-oaq-v1", "kw-sensor-coci-v2"],
      monitor: ["kw-sensor-v1-1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-oaq-sensor-dot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/oaq/sensor/dot"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-sensor-v1-response-dot", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-ickp1"], // kw-iaq-ctl-kiot-plain-v1
      preprocessor: ["kw-oaq-ctl-kiot-plain-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb-tsmeta",
          converter: ["kw-sensor-v1-opentsdb-tsmeta"],
          metric: "kw-iaq-ctl-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/iaq/ctl/kiot"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-ctl-v1-response", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-icke1"], // kw-iaq-ctl-kiot-enc-v1
      preprocessor: ["kw-oaq-ctl-kiot-enc-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb-tsmeta",
          converter: ["kw-sensor-v1-opentsdb-tsmeta"],
          metric: "kw-iaq-ctl-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/iaq/ctl/kiot"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-ctl-v1-response", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-ockp1"], // kw-oaq-ctl-kiot-plain-v1
      preprocessor: ["kw-oaq-ctl-kiot-plain-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb-tsmeta",
          converter: ["kw-sensor-v1-opentsdb-tsmeta"],
          metric: "kw-oaq-ctl-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/oaq/ctl/kiot"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-ctl-v1-response", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-ocke1"], // kw-oaq-ctl-kiot-enc-v1
      preprocessor: ["kw-oaq-ctl-kiot-enc-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb-tsmeta",
          converter: ["kw-sensor-v1-opentsdb-tsmeta"],
          metric: "kw-oaq-ctl-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/oaq/ctl/kiot"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-ctl-v1-response", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-ocde1"], // kw-oaq-ctl-dot-enc-v1
      preprocessor: ["kw-oaq-ctl-dot-enc-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb-tsmeta",
          converter: ["kw-sensor-v1-opentsdb-tsmeta"],
          metric: "kw-oaq-ctl-dot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/oaq/ctl/dot"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
        {
          type: "http-server",
          converter: ["ir-httpserver-forward-get"],
          forwarding: {
            loadBalancing: "none",
            address: ["115.84.165.173:8090/dotmtr"],
          },
        },
      ],
      postprocessor: ["kw-ctl-v1-response", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-ocde1-1"], // kw-oaq-ctl-dot-enc-v1-1 (sdot renewal: mtr test)
      preprocessor: ["kw-oaq-ctl-dot-enc-v1"],
      monitor: ["kw-sensor-v1-1-zk"],
      to: [
        {
          type: "opentsdb-tsmeta",
          converter: ["kw-sensor-v1-opentsdb-tsmeta"],
          metric: "kw-oaq-ctl-dot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/oaq/ctl/dot"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
        {
          type: "http-server",
          converter: ["ir-httpserver-forward-get"],
          forwarding: {
            loadBalancing: "none",
            address: ["220.95.232.212:8090/dotmtr"],
          },
        },
      ],
      postprocessor: ["kw-ctl-v1-1-response", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-vskp1"], // kw-vent-sensor-kiot-plain-v1
      preprocessor: ["kw-vent-sensor-kiot-plain-v1", "kw-sensor-scale-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-vent-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/vent/sensor/kiot"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-isep1"], // kw-iaq-sensor-etc-plain-v1
      preprocessor: ["kw-oaq-sensor-etc-plain-v1", "kw-sensor-scale-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-iaq-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/iaq/sensor/etc"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-osep1"], // kw-oaq-sensor-etc-plain-v1
      preprocessor: ["kw-oaq-sensor-etc-plain-v1", "kw-sensor-scale-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-oaq-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/oaq/sensor/etc"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-vsep1"], // kw-vent-sensor-etc-plain-v1
      preprocessor: ["kw-oaq-sensor-etc-plain-v1", "kw-sensor-scale-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-vent-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/vent/sensor/etc"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-isup1"], // kw-iaq-sensor-update-plain-v1
      preprocessor: ["kw-oaq-sensor-etc-plain-v1"],
      enricher: ["kw-sensor-cici-v2"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-iaq-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
      ],
      postprocessor: ["kw-debug-v1-redis-pub"],
    },
    {
      id: ["import_kw-iskp1"], // Import: kw-iaq-sensor-kiot-plain-v1
      preprocessor: ["kw-oaq-sensor-etc-plain-v1", "kw-sensor-scale-v1"],
      enricher: ["kw-sensor-cici-v2"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-iaq-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
      ],
      postprocessor: ["kw-debug-v1-redis-pub"],
    },
    {
      id: ["import_kw-oskp1"], // Import: kw-oaq-sensor-kiot-plain-v1
      preprocessor: ["kw-oaq-sensor-etc-plain-v1", "kw-sensor-scale-v1"],
      enricher: ["kw-sensor-pm-oaq-v1", "kw-sensor-coci-v2"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-oaq-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
      ],
      postprocessor: ["kw-debug-v1-redis-pub"],
    },
    {
      id: ["import_kw-osdp1"], // Import: kw-oaq-sensor-dot-plain-v1
      preprocessor: ["kw-oaq-sensor-etc-plain-v1", "kw-sensor-scale-v1"],
      enricher: ["kw-sensor-pm-oaq-v1", "kw-sensor-coci-v2"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-oaq-sensor-dot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
      ],
      postprocessor: ["kw-debug-v1-redis-pub"],
    },
    {
      id: ["server_kwkiotcluster-redis"], // Server: KW Redis
      to: [
        {
          type: "redis",
          converter: ["ir-irdata-filter-data"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-debug-v1-redis-pub"],
    },
    {
      id: ["server_kwkiotcluster-redis-pub"], // Server: KW Redis-pub
      to: [
        {
          type: "redis-pub",
          converter: ["ir-irdata-filter-data"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
    },
    {
      id: ["server_kwkiotcluster-mqtt"], // Server: KW MQTT
      to: [
        {
          type: "mqtt",
          converter: ["ir-irdata-filter-data"],
          forwarding: {
            loadBalancing: "rr",
            address: serverTable.kwKiotCluster.mqtt.address,
          },
        },
      ],
    },
    {
      id: ["server_kwkiotcluster-mqtt-seq"], // Server: KW MQTT-SEQ
      to: [
        {
          type: "mqtt-seq",
          converter: ["ir-irdata-filter-data"],
          forwarding: {
            loadBalancing: "rr",
            address: serverTable.kwKiotCluster.mqtt.address,
          },
        },
      ],
    },
    {
      id: ["test-keti-sensor"],
      preprocessor: ["keti-sensor-v2"],
      enricher: ["keti-sensor-v2-nopnn", "keti-test-randomint", "keti-sensor-v2-occ", "keti-sensor-v2-pmvppd"],
      monitor: ["keti-sensor-v2-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["keti-sensor-v2-opentsdb"],
          metric: "keti-sensor",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:keti/sensor"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
        {
          type: "mqtt",
          channel: ["ingress-router/v1/sensors.get:keti/sensor"],
          forwarding: {
            loadBalancing: "rr",
            address: serverTable.kwKiotCluster.mqtt.address,
          },
        },
      ],
    },
    {
      id: ["test-keti-sensor-zkrr"],
      preprocessor: ["keti-sensor-v2"],
      monitor: ["keti-sensor-v2-zk"],
      to: [
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:keti/sensor"],
          forwarding: {
            loadBalancing: "zk-rr",
            address: serverTable.kwKiotCluster.zookeeper.address,
            znode: "/ingress-router/monitor/kweather/servers/kiot-redis",
          },
        },
        {
          type: "opentsdb",
          converter: ["keti-sensor-v2-opentsdb"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
      ],
    },
    {
      //2022-03-21 range test
      id: ["test-kw-sensor"],
      preprocessor: ["kw-oaq-sensor-kiot-plain-v1", "kw-sensor-scale-v1", "kw-sensor-range-v1"],
      monitor: ["keti-sensor-v2-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "test.kw-iaq-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
      ],
    },
    {
      //2022-03-31 TSDB에 저장 및 확인 Test
      id: ["kw-bstp1"], // kw-beems-sensor-test-plain-v1
      preprocessor: [
        "kw-beems-sensor-test-plain-v1",
        //'kw-beems-sensor-test-plain-v1',
        //'kw-sensor-scale-vt',
        //'kw-sensor-range-vt'
      ],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-beems-sensor-test",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/beems/sensor/test"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-debug-v1-redis-pub"],
    },
    {
      //2022-08-30
      id: ["kw-asbp1"],
      preprocessor: ["kw-vent-sensor-kiot-plain-v1", "kw-sensor-beems-scale-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-aircon-sensor-beems",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/aircon/sensor/beems"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
    },
    {
      //2022-08-30
      id: ["kw-watt-asbp1"],
      preprocessor: ["kw-vent-sensor-kiot-plain-v1", "kw-sensor-beems-scale-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-aircon-sensor-beems",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
      ],
    },
    {
      id: ["kw-csbp1"],
      preprocessor: ["kw-vent-sensor-kiot-plain-v1", "kw-sensor-beems-scale-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-cleaner-sensor-beems",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/cleaner/sensor/beems"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
    },
    {
      id: ["kw-watt-csbp1"],
      preprocessor: ["kw-vent-sensor-kiot-plain-v1", "kw-sensor-beems-scale-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-cleaner-sensor-beems",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
      ],
    },
    {
      id: ["kw-vsbp1"],
      preprocessor: ["kw-vent-sensor-kiot-plain-v1", "kw-sensor-beems-scale-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-vent-sensor-beems",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/vent/sensor/beems"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
    },
    {
      id: ["kw-watt-vsbp1"],
      preprocessor: ["kw-vent-sensor-kiot-plain-v1", "kw-sensor-beems-scale-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-vent-sensor-beems",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
      ],
    },
    {
      id: ["kw-isbe1"],
      preprocessor: ["kw-oaq-sensor-kiot-enc-v1", "kw-sensor-scale-v1", "kw-sensor-range-v1"],
      monitor: ["kw-sensor-v1-zk"],
      enricher: ["kw-sensor-cici-v2", "kw-sensor-cmd-iaqvent-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-iaq-sensor-beems",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb-iaq-vent"],
          metric: "kw-iaq-sensor-beems",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          converter: ["kw-sensor-v1-pub-sensor-vent"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
        {
          type: "mqtt-seq",
          converter: ["kw-sensor-v1-pub-vent-cmd"],
          forwarding: {
            loadBalancing: "rr",
            address: serverTable.kwKiotCluster.mqtt.address,
          },
        },
      ],
      postprocessor: ["kw-sensor-v1-response", "kw-debug-v1-redis-pub"],
    },
    {
      // 2020-08-30 iaq 추가
      id: ["kw-icbe1"],
      preprocessor: ["kw-oaq-ctl-kiot-enc-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb-tsmeta",
          converter: ["kw-sensor-v1-opentsdb-tsmeta"],
          metric: "kw-iaq-ctl-beems",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/iaq/ctl/beems"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-ctl-v1-response", "kw-debug-v1-redis-pub"],
    }, //11.16
    {
      id: ["kw-ksmw1"],
      preprocessor: ["kw-sensor-metal-kiot-plain-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/sensor/metal"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-ksmw1",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
      ],
      postprocessor: ["kw-ctl-v1-response", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-vske1"], // kw-vent-sensor-kiot-plain-v1
      preprocessor: ["kw-vent-sensor-kiot-enc-v1", "kw-sensor-scale-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb",
          converter: ["kw-sensor-v1-opentsdb"],
          metric: "kw-vent-sensor-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          converter: ["kw-sensor-v1-pub-sensor-vent"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-ctl-v1-response", "kw-debug-v1-redis-pub"],
    },
    {
      id: ["kw-vcke1"], // kw-iaq-ctl-kiot-enc-v1
      preprocessor: ["kw-oaq-ctl-kiot-enc-v1"],
      monitor: ["kw-sensor-v1-zk"],
      to: [
        {
          type: "opentsdb-tsmeta",
          converter: ["kw-sensor-v1-opentsdb-tsmeta"],
          metric: "kw-iaq-ctl-kiot",
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.opentsdbWo.address,
          },
        },
        {
          type: "redis-pub",
          channel: ["ingress-router/v1/sensors.get:kw/iaq/ctl/kiot"],
          forwarding: {
            loadBalancing: "none",
            address: serverTable.kwKiotCluster.redis.address,
          },
        },
      ],
      postprocessor: ["kw-ctl-v1-response", "kw-debug-v1-redis-pub"],
    },
  ],
};

module.exports = {
  routingTable: routingTable,
};
