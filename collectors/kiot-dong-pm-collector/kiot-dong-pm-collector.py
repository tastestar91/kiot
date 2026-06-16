#!/usr/bin/env python3

#-------------------------------------------------------------------
# kiot-dong-pm-collector [Python3/TAB]
#
# yskwon, 2020-06-01
#-------------------------------------------------------------------

import json
import signal
import sys
import time
import traceback
from datetime import datetime

import pymysql.cursors
import requests
import schedule

# Global constants
CONFIG_FILE = "/opt/apps/apps-config.json"
MYSQL_DEFAULT_FETCH_ROWS = 20
HTTP_TIMEOUT = (10, 58)


# Load configurations
try:
    with open(CONFIG_FILE, 'r') as f:
        conf = json.load(f)

    # MySQL
    address = conf["servers"]["kwKiotCluster"]["mysql"]["address"][0].split(":")
    username = conf["servers"]["kwKiotCluster"]["mysql"]["username"]
    password = conf["servers"]["kwKiotCluster"]["mysql"]["password"]
    mysql_connection = pymysql.connect(host=address[0], port=int(address[1]),
            user=username, password=password, db="re_kiot", charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor, autocommit=False)

except Exception:
    traceback.print_exc()
    sys.exit(1)


def receive_signal(signal_number, frame):
    print("Received signal: " + str(signal_number))
    sys.exit()


def release():
    print("Disconnected from all servers and released all resources")
    # TODO: Close server connections and release all resources
    mysql_connection.close()

def get_dong_info():
    print("get_dong_info: start")

    rows = {}

    with mysql_connection.cursor() as cursor:
        try:
            sql = """
SELECT TDH.dcode, TDH.dtype, TDH.dname, TDMI.map_code, TDMI.map_type, TDMI.distance
FROM TB_DONG_HCODE AS TDH
JOIN TB_DONG_MAP_INFO AS TDMI
ON TDH.dcode=TDMI.dcode
ORDER BY dcode
                """
            cursor.execute(sql)
            dbrows = cursor.fetchall()
        except Exception as e:
            traceback.print_exc()

    mysql_connection.commit()

    cnt = 0
    for data in dbrows:
        if data['dcode'] in rows:
            rows[data['dcode']][cnt] = data
        else:
            cnt = 0
            rows[data['dcode']] = {}
            rows[data['dcode']][cnt] = data
        cnt += 1

    print(f"get_dong_info: rows={len(rows)}")
    return rows

# # Get Dong Info
# def get_dong_info():
#     print("get_dong_info: start")

#     rows = {}

#     with mysql_connection.cursor() as cursor:
#         try:
#             sql = """
# SELECT TDH.dcode, TDH.dtype, TDH.dname, TDMI.map_code, TDMI.map_type, TDMI.distance
# FROM TB_DONG_HCODE AS TDH
# JOIN TB_DONG_MAP_INFO AS TDMI
# ON TDH.dcode=TDMI.dcode
# ORDER BY dcode
#                 """
#             cursor.execute(sql)
#             dbrows = cursor.fetchall()
#         except Exception as e:
#             traceback.print_exc()

#     mysql_connection.commit()

#     cnt = 0
#     for data in dbrows:
#         if data['dcode'] in rows:
#             rows[data['dcode']][cnt] = data
#         else:
#             cnt = 0
#             rows[data['dcode']] = {}
#             rows[data['dcode']][cnt] = data
#         cnt += 1

#     print(f"get_dong_info: rows={len(rows)}")
#     return rows


# Get AirKorea Data
def get_airkorea_data():
    print("get_airkorea_data: start")

    rows = {}

    r = requests.get('http://kiototsdb.kweather.co.kr:24242/api/query?start=2h-ago&m=avg:1h-avg-none:airkorea-aq{air_id=*,sensor=pm10|pm25}', timeout=HTTP_TIMEOUT)
    if r.status_code == 200:
        json_data = r.json()

        for data in json_data:
            if len(data['dps']) > 0:
                if data['tags']['air_id'] in rows:
                    rows[data['tags']['air_id']][data['tags']['sensor']] = round(list(data['dps'].values())[-1])
                    rows[data['tags']['air_id']]['tm'] = datetime.fromtimestamp(int(list(data['dps'].keys())[-1])).strftime("%Y%m%d%H%M")
                else:
                    rows[data['tags']['air_id']] = {}
                    rows[data['tags']['air_id']][data['tags']['sensor']] = round(list(data['dps'].values())[-1])
                    rows[data['tags']['air_id']]['tm'] = datetime.fromtimestamp(int(list(data['dps'].keys())[-1])).strftime("%Y%m%d%H%M")
    else:
        print(f"get_airkorea_data: fail, status_code={r.status_code}")

    print(f"get_airkorea_data: rows={len(rows)}")
    return rows


# Make Dong Data
def make_dong_data(dong_info, airkorea_data):
    print("make_dong_data: start")

    rows = {}
    for key in dong_info:
        cnt = 0
        idw_pm10_wr = 0
        idw_pm25_wr = 0
        idw_w = 0
        map_data = {}

        for subkey in dong_info[key]:
            # A: Airkorea data]
   
            if dong_info[key][subkey]['map_code'] in  airkorea_data and 'pm10' in airkorea_data[dong_info[key][subkey]['map_code']] and 'pm25' in airkorea_data[dong_info[key][subkey]['map_code']]:
                map_data[cnt] = dong_info[key][subkey]
                map_data[cnt]['pm10_value'] = airkorea_data[dong_info[key][subkey]['map_code']]['pm10']
                map_data[cnt]['pm25_value'] = airkorea_data[dong_info[key][subkey]['map_code']]['pm25']
                map_data[cnt]['pm10_grade'] = get_pm10_grade(airkorea_data[dong_info[key][subkey]['map_code']]['pm10'])
                map_data[cnt]['pm25_grade'] = get_pm25_grade(airkorea_data[dong_info[key][subkey]['map_code']]['pm25'])
                map_data[cnt]['tm'] = airkorea_data[dong_info[key][subkey]['map_code']]['tm']

                idw_pm10_wr += (airkorea_data[dong_info[key][subkey]['map_code']]['pm10'] / dong_info[key][subkey]['distance']**2)
                idw_pm25_wr += (airkorea_data[dong_info[key][subkey]['map_code']]['pm25'] / dong_info[key][subkey]['distance']**2)
                idw_w += (1 / dong_info[key][subkey]['distance']**2)
                cnt += 1

        if cnt > 0:
            rows[key] = {}
            pm10 = round(idw_pm10_wr / idw_w)
            pm25 = round(idw_pm25_wr / idw_w)

            rows[key]['dong_data'] = {
                'dcode': key, 
                'map_type': dong_info[key][0]['map_type'],
                'pm10_value': pm10,
                'pm25_value': pm25,
                'pm10_grade': get_pm10_grade(pm10),
                'pm25_grade': get_pm25_grade(pm25) 
            }

            rows[key]['map_data'] = map_data

    print(f"make_dong_data: rows={len(rows)}")
    return rows


# Update Dong Data
def update_dong_data(nowdate, dong_data):
    print("update_dong_data: start")

    sql_dong_dust_update = """
        INSERT INTO TB_DONG_DUST_DATA (dcode, map_type, pm10_value, pm10_grade, pm25_value, pm25_grade, up_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            map_type = %s,
            pm10_value = %s,
            pm10_grade = %s,
            pm25_value = %s,
            pm25_grade = %s,
            up_date = %s
    """

    sql_dong_map_delete = "DELETE FROM TB_DONG_MAP_DATA WHERE dcode=%s"

    sql_dong_map_insert = """
        INSERT INTO TB_DONG_MAP_DATA (dcode, map_code, map_type, distance, pm10_value, pm10_grade, pm25_value, pm25_grade, up_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    with mysql_connection.cursor() as cursor:
        try:
            count = 0
            for key in dong_data:
                count = count +1
                # update dong_data
                cursor.execute(sql_dong_dust_update,(
                                dong_data[key]['dong_data']['dcode'],
                                dong_data[key]['dong_data']['map_type'],
                                dong_data[key]['dong_data']['pm10_value'],
                                dong_data[key]['dong_data']['pm10_grade'],
                                dong_data[key]['dong_data']['pm25_value'],
                                dong_data[key]['dong_data']['pm25_grade'],
                                nowdate,
                                dong_data[key]['dong_data']['map_type'],
                                dong_data[key]['dong_data']['pm10_value'],
                                dong_data[key]['dong_data']['pm10_grade'],
                                dong_data[key]['dong_data']['pm25_value'],
                                dong_data[key]['dong_data']['pm25_grade'],
                                nowdate )
                        )
                # delete map_data
                cursor.execute(sql_dong_map_delete, (dong_data[key]['dong_data']['dcode']))

                for subkey in dong_data[key]['map_data']:
                    # insert map_data
                    cursor.execute(sql_dong_map_insert, (
                                dong_data[key]['map_data'][subkey]['dcode'],
                                dong_data[key]['map_data'][subkey]['map_code'],
                                dong_data[key]['map_data'][subkey]['map_type'],
                                dong_data[key]['map_data'][subkey]['distance'],
                                dong_data[key]['map_data'][subkey]['pm10_value'],
                                dong_data[key]['map_data'][subkey]['pm10_grade'],
                                dong_data[key]['map_data'][subkey]['pm25_value'],
                                dong_data[key]['map_data'][subkey]['pm25_grade'],
                                dong_data[key]['map_data'][subkey]['tm'] )
                        )

            mysql_connection.commit()

        except Exception as e:
            traceback.print_exc()

    print(f"update_dong_data: end={len(dong_data)}")
    print(f"update_dong_data: end={len(dong_data)}")



# Get PM10 Grade (WHO)
def get_pm10_grade(pm10):
    grade = 1
    if pm10 <= 30:
        grade = 1
    elif pm10 <= 50:
        grade = 2
    elif pm10 <= 100:
        grade = 3
    else:
        grade = 4

    return grade

# Get PM25 Grade (WHO)
def get_pm25_grade(pm25):
    grade = 1
    if pm25 <= 15:
        grade = 1
    elif pm25 <= 25:
        grade = 2
    elif pm25 <= 50:
        grade = 3
    else:
        grade = 4

    return grade


# Job to be scheduled
def job():
    print("job: start - " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    nowdate = datetime.now().strftime('%Y%m%d%H%M')
    print("job: nowdate - " + nowdate)

    dong_info = get_dong_info()
    airkorea_data = get_airkorea_data()
    dong_data = make_dong_data(dong_info, airkorea_data)
    
    update_dong_data(nowdate, dong_data)

    print("job: end - " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    print("================================================")

# Main
if __name__ == '__main__':
	print("Started kiot-dashboard-stat-collector.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)

	try:
		job()
		# Schedule a job
		schedule.every().hour.at(":09").do(job)
		schedule.every().hour.at(":19").do(job)
		schedule.every().hour.at(":29").do(job)
		schedule.every().hour.at(":39").do(job)
		schedule.every().hour.at(":49").do(job)
		schedule.every().hour.at(":59").do(job)

		while True:
			schedule.run_pending()
			time.sleep(1)
	except (KeyboardInterrupt, SystemExit):
		print("Stopping kiot-dashboard-stat-collector.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped kiot-dashboard-stat-collector.")
