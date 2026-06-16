#!/usr/bin/env python3

#-------------------------------------------------------------------
# make-airkor-info [Python3/TAB]
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


# Load configurations
try:
	with open(CONFIG_FILE, 'r') as f:
		conf = json.load(f)

	# MySQL
	address = conf["servers"]["kwKiotCluster"]["mysql"]["address"][0].split(":")
	username = conf["servers"]["kwKiotCluster"]["mysql"]["username"]
	password = conf["servers"]["kwKiotCluster"]["mysql"]["password"]
	mysql_connection = pymysql.connect(host='220.95.232.212', port=int(address[1]),
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


# Get Airkor Info
def get_airkor_info():
	print("get_airkor_info: start")

	rows = {}

	with mysql_connection.cursor() as cursor:
		try:
			sql = "SELECT air_code, use_yn FROM TB_DONG_AIRKOR_INFO"
			cursor.execute(sql)
			dbrows = cursor.fetchall()
		except Exception as e:
			traceback.print_exc()

	mysql_connection.commit()

	for data in dbrows:
		rows[data['air_code']] = data

	print(f"get_airkor_info: rows={len(rows)}")
	return rows



# Get AirKorea Data
def get_airkorea_data():
	print("get_airkorea_data: start")

	rows = {}

	r = requests.get('http://kiototsdb.kweather.co.kr:24242/api/query?start=1d-ago&m=avg:1d-avg-none:airkorea-aq{air_id=*,sensor=pm10|pm25}')
	if r.status_code == 200:
		json_data = r.json()
		for data in json_data:
			if len(data['dps']) == 1:
				if data['tags']['air_id'] in rows:
					rows[data['tags']['air_id']][data['tags']['sensor']] = round(list(data['dps'].values())[0])
					rows[data['tags']['air_id']]['tm'] = datetime.fromtimestamp(int(list(data['dps'].keys())[0])).strftime("%Y%m%d%H%M")
				else:
					rows[data['tags']['air_id']] = {}
					rows[data['tags']['air_id']][data['tags']['sensor']] = round(list(data['dps'].values())[0])
					rows[data['tags']['air_id']]['tm'] = datetime.fromtimestamp(int(list(data['dps'].keys())[0])).strftime("%Y%m%d%H%M")
	else:
		print(f"get_airkorea_data: fail, status_code={r.status_code}")

	print(f"get_airkorea_data: rows={len(rows)}")

	return rows



# Make Airkor Info
def make_airkor_info(airkor_info, airkor_data):
	print("make_airkor_info: start")

	rows = {}

	for key in airkor_info:
		if airkor_info[key]['use_yn'] == 'Y':
			if key not in airkor_data or 'pm10' not in airkor_data[key] or 'pm25' not in airkor_data[key]:
				rows[key] = {'air_code': key, 'use_yn': 'N'}
		else:
			if key in airkor_data and 'pm10' in airkor_data[key] and 'pm25' in airkor_data[key]:
				rows[key] = {'air_code': key, 'use_yn': 'Y'}

	print(f"make_airkor_info: rows={len(rows)}")
	return rows



# Update Airkor Info
def update_airkor_info(airkor_info_update):
	print("update_airkor_info: start")

	sql = "UPDATE TB_DONG_AIRKOR_INFO SET use_yn=%s, reg_date=CURRENT_TIMESTAMP WHERE air_code=%s"

	with mysql_connection.cursor() as cursor:
		try:

			for key in airkor_info_update:
				cursor.execute(sql, (airkor_info_update[key]['use_yn'], airkor_info_update[key]['air_code']) )

			mysql_connection.commit()

		except Exception as e:
			traceback.print_exc()

	print(f"update_airkor_info: end={len(airkor_info_update)}")



def job():
	print("job: start - " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

	nowdate = datetime.now().strftime('%Y%m%d%H%M')
	print("job: nowdate - " + nowdate)

	airkor_info = get_airkor_info()
	airkor_data = get_airkorea_data()
	airkor_info_update = make_airkor_info(airkor_info, airkor_data)
	update_airkor_info(airkor_info_update)

	print("job: end - " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
	print("================================================")


# Main
if __name__ == '__main__':
	print("Started make-airkor-info.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)

	try:
		job()

	except (KeyboardInterrupt, SystemExit):
		print("Stopping kiot-dashboard-stat-collector.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped make-airkor-info.")
