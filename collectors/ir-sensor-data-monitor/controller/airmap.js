const debug = require("debug")("ir-sensor-data-monitor:controller:airmap");
const request = require("request-promise-native");

const conf = require("../conf/config").sensorDataMonitor;
const confCollector = require(conf.appsConfFile);

tsdb_query_url = "http://" + confCollector["servers"]["kwKiotCluster"]["opentsdb"]["address"][0] + "/api/query?";

let httpOptions = {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  forever: true,
  timeout: 50000,
  uri: tsdb_query_url,
  body: "",
  json: true,
};

function httpArea(start, end, area, number, sensor) {
  if (area === "11") {
    httpOptions.body = {
      timezone: "Asia/Seoul",
      useCalendar: true,
      start: start,
      end: end,
      queries: [{ metric: `kw-kgkw1.${area}`, aggregator: "sum", tags: { grid: "*", sensor: `${sensor}|lon|lat` } }],
    };
    return httpOptions;
  } else {
    httpOptions.body = {
      timezone: "Asia/Seoul",
      useCalendar: true,
      start: start,
      end: end,
      queries: [{ metric: `kw-kgkw1.${area}.${number}`, aggregator: "sum", tags: { grid: "*", sensor: `${sensor}|lon|lat` } }],
    };
    return httpOptions;
  }
}

function isGrid(result, row) {
  result[row["tags"]["grid"]]["data"][row["tags"]["sensor"]] = Object.values(row["dps"])[0];
}

function isNotGrid(result, row) {
  result[row["tags"]["grid"]] = {
    ["data"]: {
      [row["tags"]["sensor"]]: Object.values(row["dps"])[0],
    },
  };
}

module.exports = {
  areaData: async (req, res) => {
    const { start, end, area, sensor } = req.query;

    try {
      if (area === "11") {
        const areaData = await request(httpArea(start, end, area, 0, sensor));

        if (!areaData) {
          throw new Error("No Data");
        }
        let result = {};

        areaData.forEach((row) => {
          result[row["tags"]["grid"]] ? isGrid(result, row) : isNotGrid(result, row);
        });
        res.status(200).json(result);
      } else {
        const areaData = await Promise.all([
          request(httpArea(start, end, area, 0, sensor)),
          request(httpArea(start, end, area, 1, sensor)),
          request(httpArea(start, end, area, 2, sensor)),
        ]);

        if (!areaData) {
          throw new Error("No Data");
        }
        let result = {};
        areaData.flat().forEach((row) => {
          result[row["tags"]["grid"]] ? isGrid(result, row) : isNotGrid(result, row);
        });
        res.status(200).json(result);
      }
    } catch (err) {
      debug(`ERR: [OpenTSDB/AIRMAP]: ${err}`);
    }
  },
};
