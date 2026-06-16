#!/usr/bin/env python3

# ---------------------------------------------------------------------------
# TSDB Data Updater for TSDB CLI [Python3/4space]
#
# Dongwoo Kwon (dwkwon80@gmail.com), Last modified: 2022-03-30
# ---------------------------------------------------------------------------

import json

import requests


# Global constants
HTTP_TIMEOUT = 10
TSDB_ADDRESS = 'http://10.100.100.100:24242'

LOOKUP_JSON_FILE = 'iaq-serial.json'
START_DATE = '2022/01/01-00:00:00'
END_DATE = '2022/03/29-00:00:00'
SENSOR_LIST = ['temp', 'humi', 'co2', 'voc', 'noise']

TSDB_CMD_SH_FILE = 'delete-cmds.sh'
TSDB_CMD_DELETE = False     # WARNING!!!


def get_metrics_from_lookup_file(filename):
    with open(filename, 'r') as f:
        serial_info = json.load(f)

    metrics = []
    for ts in serial_info['results']:
        metrics.append(ts['metric'] + '.' + ts['tags']['serial'])

    return metrics


def get_metrics():
    # V01T1623100 ~ V01T1623139
    prefix = 'kw-iaq-sensor-kiot.V01T'
    #return [prefix + str(n) for n in range(1623100, 1623140)]

    #return ['kw-iaq-sensor-kiot.V01T1623113']
    return ['kw-iaq-sensor-kiot.V01T1623131']


def get_tsdb_data(start, end, metric, sensor):
    q = {
        'start': start,
        'end': end,
        'queries': [
            {
                'aggregator': 'sum',
                'explicitTags': True,
                'metric': metric,
                'tags': {
                    'sensor': sensor
                }
            }
        ]
    }
    
    return s.post(TSDB_ADDRESS + '/api/query', json=q, timeout=HTTP_TIMEOUT)


def put_tsdb_data(timestamps, metric, sensor, value, send=False):
    q = []
    for ts in timestamps:
        q.append({
            'timestamp': int(ts),
            'metric': metric,
            'tags': {
                'sensor': sensor
            },
            'value': value
        })

    if send:
        return s.post(TSDB_ADDRESS + '/api/put', json=q, timeout=HTTP_TIMEOUT)
    else:
        print(f'INFO: TSDB PUT Query = {q}')
        return None


def get_timestamp_ranges(dps):
    inrange = False
    prev = (None, None)
    timestamps = []
    error_ts_list = []

    for k, v in dps.items():
        #if v == -9999:
        if v < -900:
            if not inrange:
                inrange = True
                start = k
            end = k
            error_ts_list.append(k)
        else:
            # First error case
            if len(timestamps) != 0 and timestamps[-1][2][1] is None:
                timestamps[-1][2] = (k, v)

            if inrange:
                if start == end:
                    end = str(int(end) + 1)
                timestamps.append([start, end, prev, error_ts_list])
                error_ts_list = []
                inrange = False
            prev = (k, v)

    return timestamps


def process_tsdb_data(timestamps, metric, tag, check=False,
                      update=False, file_obj=None, delete=False):
    for start, end, prev, error_tss in timestamps:
        if check:
            r = get_tsdb_data(start, end, metric, tag)
            r.raise_for_status()
            print(f'INFO: {metric}: {sensor}: {start}-{end}: '
                  f'data = {r.json()[0]["dps"]}')

        if file_obj is not None:
            cmd = f'./tsdb scan {start} {end} sum {metric} sensor={sensor}'
            if delete == True:
                cmd += ' --delete\n'
            else:
                cmd += '\n'
            f.write(cmd)

        r = put_tsdb_data(error_tss, metric, tag, prev[1], send=update)
        if r is not None:
            r.raise_for_status()


if __name__ == '__main__':
    s = requests.Session()

    # IAQ Full scan (WARNING!)
    # metric_list = get_metrics_from_lookup_file('iaq-serial.json')

    # Specific devices only
    metric_list = get_metrics()

    with open(TSDB_CMD_SH_FILE, 'w') as f:
        for metric in metric_list:
            for sensor in SENSOR_LIST:
                try:
                    r = get_tsdb_data(START_DATE, END_DATE, metric, sensor)
                    r.raise_for_status()
    
                    dps = r.json()
                    if len(dps) == 0 or 'dps' not in dps[0]:
                        continue

                    timestamps = get_timestamp_ranges(dps[0]['dps'])
                    print(f'INFO: {metric}: {sensor}: {timestamps}')
                    if len(timestamps) != 0:
                        # For updating data, set 'update' to True
                        process_tsdb_data(timestamps, metric, sensor,
                                          check=True, update=False,
                                          file_obj=f, delete=TSDB_CMD_DELETE)
                except Exception as e:
                    print(f'ERROR: {metric}: {sensor}: {e}')

