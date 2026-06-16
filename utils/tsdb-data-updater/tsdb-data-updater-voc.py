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


#START_DATE = '2020/10/31-00:00:00'
#END_DATE = '2022/03/13-11:00:59'

START_DATE = '2022/01/31-06:14:00'
END_DATE   = '2022/01/31-06:59:59'

SENSOR_LIST = ['voc']


def get_metrics():
    # V01T1623100 ~ V01T1623139
    #prefix = 'kw-iaq-sensor-kiot.V01T'
    #return [prefix + str(n) for n in range(1623100, 1623140)]

    return ['kw-iaq-sensor-kiot.ICW0W2001039']


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
    
    q.append({
        'timestamp': int(timestamps),
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



def process_tsdb_data(dps, metric, tag, update=False):
    q = []
    for k, v in dps.items():   
        # update: origin value / 10
        updateValue = v / 10
        
        r = put_tsdb_data(k, metric, tag, updateValue, send=update)
        if r is not None:
            r.raise_for_status()   


if __name__ == '__main__':
    s = requests.Session()

    # Specific devices only
    metric_list = get_metrics()

    for metric in metric_list:
        for sensor in SENSOR_LIST:
            try:
                r = get_tsdb_data(START_DATE, END_DATE, metric, sensor)
                r.raise_for_status()

                dps = r.json()
                if len(dps) == 0 or 'dps' not in dps[0]:
                    continue

                process_tsdb_data(dps[0]['dps'], metric, sensor, update=True)    
                #process_tsdb_data(dps[0]['dps'], metric, sensor, update=False)
                        
            except Exception as e:
                print(f'ERROR: {metric}: {sensor}: {e}')
