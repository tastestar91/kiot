import json
import signal
import sys
import time
import time as timelibrary
import traceback
import pandas as pd
import glob
import os
import socket

from datetime import datetime

import requests
import schedule

# 삭제
from rediscluster import RedisCluster

# Global constants
CONFIG_FILE = "/opt/apps/apps-config.json"
HTTP_TIMEOUT = (10, 58)

PSEUDO_SERVICE_ID = "kw-kgkw1"
METAL_SERVICE_ID = "kw-kgmw1"
REDIS_CHANNEL_NAME = "airmap/weather"

AIRMAP_METRIC_PREFIX = "kw-kgkw1"
REDIS_CHANNEL_NAME = "gps/weather"
# Load configurations

AREA = {
	'seoul' : 11,
	'busan' : 26,
	'daegu' : 27,
	'incheon' : 28,
	'gwangju' : 29,
	'daejeon' : 30,
	'ulsan' : 31,
	'sejon' : 36,
	'gyeonggi' : 41,
	'gangwon' : 42,
	'jeonbuk' : 43,
	'jeonnam' : 44,
	'gyeongbuk' : 45,
	'gyeongnam' : 46,
	'gyeongbuk' : 47,
	'gyeongnam' : 48,
	'jeju' : 50,
}

AIRMAP_SENSOR_FIELDS = [
	{ "field": 2, "sensor_name": "lon" }, 
	{ "field": 3, "sensor_name": "lat" },
	{ "field": 4, "sensor_name": "uw" },
	{ "field": 5, "sensor_name": "vw" }, 
	{ "field": 6, "sensor_name": "wd" },
	{ "field": 7, "sensor_name": "ws" },
	{ "field": 8, "sensor_name": "h" },
	{ "field": 9, "sensor_name": "t" },
	{ "field": 10, "sensor_name": "pm10" },
	{ "field": 11, "sensor_name": "pm25" },
	{ "field": 12, "sensor_name": "poorPm10" },
	{ "field": 13, "sensor_name": "poorPm25" },
	{ "field": 14, "sensor_name": "Al" },
	{ "field": 15, "sensor_name": "Ti" },
	{ "field": 16, "sensor_name": "V" },
	{ "field": 17, "sensor_name": "Mn" },
	{ "field": 18, "sensor_name": "Fe" },
	{ "field": 19, "sensor_name": "Ni" },
	{ "field": 20, "sensor_name": "Co" },
	{ "field": 21, "sensor_name": "Cu" },
	{ "field": 22, "sensor_name": "Zn" },
	{ "field": 23, "sensor_name": "As" },
	{ "field": 24, "sensor_name": "Sr" },
	{ "field": 25, "sensor_name": "Mo" },
	{ "field": 26, "sensor_name": "Cd" },
	{ "field": 27, "sensor_name": "Ba" },
	{ "field": 28, "sensor_name": "Pb" },
	{ "field": 29, "sensor_name": "P" },
	{ "field": 30, "sensor_name": "S" },
	{ "field": 31, "sensor_name": "Cr" },
	{ "field": 32, "sensor_name": "Si" }
	]



try:
	with open(CONFIG_FILE, 'r') as f:
		conf = json.load(f)

	redis_startup_nodes = []
	for address in conf["servers"]["kwKiotCluster"]["redis"]["address"][0].split(","):
		address = address.split(":")
		redis_startup_nodes.append({"host": address[0], "port": address[1]})

	rc = RedisCluster(startup_nodes=redis_startup_nodes, decode_responses=True,
		password=conf["servers"]["kwKiotCluster"]["redis"]["password"])

	# ingress-router/v1/sensors.get: + gps/weather
	redis_ir_channel = conf["collector"]["redis"]["dataChannelV1"]["get"] + REDIS_CHANNEL_NAME


	s = requests.Session()
	s.mount("http://", requests.adapters.HTTPAdapter(pool_connections=1, pool_maxsize=1))

	tsdb_query_url = conf["servers"]["kwKiotCluster"]["opentsdbWo"]["address"][0].split(':')

	# Default last_updated_datetime (every 10 minutes)
	timestamp = (int(time.time()/600))*600
	last_updated_datetime = datetime.fromtimestamp(timestamp).strftime("%Y%m%d%H%M")
	print(f"INFO: Set default lastUpdatedDatetime: {last_updated_datetime}-{timestamp}")


except Exception:
	traceback.print_exc()
	sys.exit(1)


def receive_signal(signal_number, frame):
	print("Received signal: " + str(signal_number))
	sys.exit()

def sendTelegram(message):
	token = conf["telegram"]["token"]
	chat_id = conf["telegram"]["chat_id"]
	r = s.post(f'https://api.telegram.org/bot${token}/sendmessage?chat_id=${chat_id}&text=${message}')
	r.raise_for_status()

def release():
	print("Disconnected from all servers and released all resources")
	# TODO: Close server connections and release all resources


def read_csv(file):
	file_split = file.split('.')[0].split('_')
	file_area = file_split[0]
	timestamp = int(timelibrary.mktime(datetime.strptime(file_split[2], "%Y%m%d%H%M").timetuple()))
	area_number = AREA[file_area]

	df = pd.read_csv(file, index_col=11)
	rows = list(df.values) 

	if (area_number == 50):
		publish_to_redis_jeju(rows, timestamp, area_number)
		send_to_tsdb_jeju(rows, timestamp, area_number)
	else :
		publish_to_redis_seoul(rows, timestamp, area_number)
		publish_to_redis_metal(rows, timestamp, area_number)
		send_to_tsdb_seoul(rows, timestamp, area_number)


def publish_to_redis_metal(rows, timestamp, area_number):
	ir_data = {
		"service": {
			"id": METAL_SERVICE_ID,
			"timestamp": timestamp,
			"areaId" : area_number
		}
	}
	
	for row in rows:
		ir_data["service"]["deviceId"] = str(int(row[0])).zfill(4) + str(int(row[1])).zfill(4)
		ir_data["data"] = {}
		
		for sensor in AIRMAP_SENSOR_FIELDS[8:]: # airmap
			ir_data["data"][sensor["sensor_name"]] = float(row[sensor["field"]]) 

		#print(ir_data, 'redis')
		rc.publish(redis_ir_channel, json.dumps(ir_data))
		


def publish_to_redis_seoul(rows, timestamp, area_number):
	ir_data = {
		"service": {
			"id": PSEUDO_SERVICE_ID,
			"timestamp": timestamp,
			"areaId" : area_number
		}
	}
	
	for row in rows:
		ir_data["service"]["deviceId"] = str(int(row[0])).zfill(4) + str(int(row[1])).zfill(4)
		ir_data["data"] = {}
		
		for sensor in AIRMAP_SENSOR_FIELDS[0:12]: # airmap
			ir_data["data"][sensor["sensor_name"]] = float(row[sensor["field"]]) 

		#print(ir_data, 'redis')
		rc.publish(redis_ir_channel, json.dumps(ir_data))

def publish_to_redis_jeju(rows, timestamp, area_number):
	ir_data = {
		"service": {
			"id": PSEUDO_SERVICE_ID,
			"timestamp": timestamp,
			"areaId" : area_number
		}
	}
	
	for row in rows:
		ir_data["service"]["deviceId"] = str(int(row[0])).zfill(4) + str(int(row[1])).zfill(4)
		ir_data["data"] = {}
		
		for sensor in AIRMAP_SENSOR_FIELDS[0:12]:
			ir_data["data"][sensor["sensor_name"]] = float(row[sensor["field"]]) 

		#print(ir_data)
		rc.publish(redis_ir_channel, json.dumps(ir_data))
	
def send_to_tsdb_seoul(rows, timestamp, area_number):
	for row in rows:
		grid = str(int(row[0])).zfill(4) + str(int(row[1])).zfill(4) # 위 경도
		area_metric = f"{AIRMAP_METRIC_PREFIX}.{area_number}"
		metric = f"{AIRMAP_METRIC_PREFIX}.{area_number}.{grid}"

		for sensor in AIRMAP_SENSOR_FIELDS:
			svalue = float(row[sensor["field"]]) 

			so.send(f"put {metric} {timestamp} {svalue} sensor={sensor['sensor_name']}\n".encode('utf-8'))
			so.send(f"put {area_metric} {timestamp} {svalue} grid={grid} sensor={sensor['sensor_name']}\n".encode('utf-8'))

	
def send_to_tsdb_jeju(rows, timestamp, area_number):
	i = 0
	for row in rows:
		grid = str(int(row[0])).zfill(4) + str(int(row[1])).zfill(4) # 위 경도
		area_metric = f"{AIRMAP_METRIC_PREFIX}.{area_number}.{i}"
		metric = f"{AIRMAP_METRIC_PREFIX}.{area_number}.{grid}"

		for sensor in AIRMAP_SENSOR_FIELDS[0:12]:
			svalue = float(row[sensor["field"]]) 

			so.send(f"put {metric} {timestamp} {svalue} sensor={sensor['sensor_name']}\n".encode('utf-8'))
			so.send(f"put {area_metric} {timestamp} {svalue} grid={grid} sensor={sensor['sensor_name']}\n".encode('utf-8'))

		i += 1
		if i == 3:
			i = 0
		
# Job to be scheduled
def job():
	print("job: start - " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
	
	nowdate = datetime.now().strftime('%Y%m%d%H%M')
	print("job: nowdate - " + nowdate)
	
	os.chdir('/hadoop3/data/klps')
	csv_file = glob.glob('*.csv')

	global so
	
	try : 
		with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as so:
			so.connect((tsdb_query_url[0], int(tsdb_query_url[1])))
			for file in csv_file :
				print(file)
				start = time.time()
				read_csv(file)
				os.remove(file)
				print("time :", time.time() - start)
			so.close()

		print("job: end - " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
		print("================================================")
	
	
	except Exception as e :
		sendTelegram('kiot:airmap' + e)
		print(f"ERROR: {e}")
# Main
if __name__ == '__main__':
	print("Started kiot-dashboard-stat-collector.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)

	try:
		job()
		schedule.every().hour.at(":00").do(job)
		schedule.every().hour.at(":10").do(job)
		schedule.every().hour.at(":20").do(job)
		schedule.every().hour.at(":30").do(job)
		schedule.every().hour.at(":40").do(job)
		schedule.every().hour.at(":50").do(job)

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


