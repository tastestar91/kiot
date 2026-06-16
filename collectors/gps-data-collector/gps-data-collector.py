import json
import signal
import sys
import time
import traceback

from datetime import datetime

import pymysql.cursors
import requests
import schedule

from rediscluster import RedisCluster

# Global constants
CONFIG_FILE = "/opt/apps/apps-config.json"

HTTP_TIMEOUT = (10, 58)

GPS_SERVICE_ID = "kw-gps1"
REDIS_CHANNEL_NAME = "gps/weather"
# Load configurations
try:
	with open(CONFIG_FILE, 'r') as f:
		conf = json.load(f)

	# Redis
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

	# MySQL
	address = conf["servers"]["kwKiotCluster"]["mysql"]["address"][0].split(":")
	username = conf["servers"]["kwKiotCluster"]["mysql"]["username"]
	password = conf["servers"]["kwKiotCluster"]["mysql"]["password"]
	mysql_connection = pymysql.connect(host=address[0], port=int(address[1]),
			user=username, password=password, db="re_kiot", charset='utf8mb4',
			cursorclass=pymysql.cursors.DictCursor, autocommit=False)

	pm_airkorea_api = "http://kiotdpd.kweather.co.kr:30101/v1/sensors/airkorea-aq"
	pm_hcode_api = "http://kiotdpd.kweather.co.kr:30101/v1/sensors/kma-aq"
	dot_oaq_sensor_jeju_api = "http://kiotdpd.kweather.co.kr:30101/v1/groups/g-jeju_iot_oaq@jeju.go.kr"
	dot_oaq_sensor_seoul_api = "http://kiotdpd.kweather.co.kr:30101/v1/groups/kw-osd"

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
	mysql_connection.close()


def gps_airkor_seoul_jeju_info():
	print("get_dong_airkor_info: start")

	with mysql_connection.cursor() as cursor:
		try:
			sql = """
				SELECT air_code, lat, lon
				FROM TB_DONG_AIRKOR_INFO
				WHERE air_city='서울' or air_city='제주'
				"""
			cursor.execute(sql)
			dbrows = cursor.fetchall()
			return dbrows
			
		except Exception as e:
			traceback.print_exc()


def pm_airkorea_info():
	try :
		r = s.get(pm_airkorea_api)
		return r.json()
	except Exception as e:
		print(e)


def gps_hcode_seoul_jeju_info():
	print("get_hcode_seoul_jeju_info: start")

	with mysql_connection.cursor() as cursor:
		try:
			sql = """
				SELECT dcode, lat, lon
				FROM TB_DONG_HCODE
				WHERE sdcode=50 or sdcode=11
				ORDER BY lat, lon
				"""
			cursor.execute(sql)
			dbrows = cursor.fetchall()
			return dbrows

		except Exception as e:
			traceback.print_exc()

def pm_hcode_info():
	try :
		r = s.get(pm_hcode_api)
		return r.json()
	except Exception as e:
		print(e)

def gps_oaq_seoul_info():
	print("get_dong_oaq_info: start")

	with mysql_connection.cursor() as cursor:
		try:
			sql = """
				SELECT serial, lat, lon
				FROM TB_DONG_OAQ_INFO
				WHERE user_id='seoul'
				ORDER BY lat, lon
				"""
			cursor.execute(sql)
			dbrows = cursor.fetchall()
			return dbrows

		except Exception as e:
			traceback.print_exc()

def gps_oaq_jeju_info():
	print("get_dong_oaq_info: start")

	with mysql_connection.cursor() as cursor:
		try:
			sql = """
				SELECT serial, lat, lon
				FROM TB_DONG_OAQ_INFO
				WHERE (serial BETWEEN 'OT3CL2000040' AND 'OT3CL2000119')
				ORDER BY lat, lon
				"""
			cursor.execute(sql)
			dbrows = cursor.fetchall()
			return dbrows

		except Exception as e:
			traceback.print_exc()

def pm_oaq_sensor_jeju_info():
	try :
		r = s.get(dot_oaq_sensor_jeju_api)
		return r.json()
	except Exception as e:
		print(e)

def pm_oaq_sensor_seoul_info():
	try :
		r = s.get(dot_oaq_sensor_seoul_api)
		return r.json()
	except Exception as e:
		print(e)

def send_data(gps_data, pm_data, data_id):
	result = []
	now = int(time.time())

	for row in gps_data:
		if row[data_id] in pm_data:
			gps_pm_data = {}
		
			if "data" in pm_data[row[data_id]]:
				if "pm25" in pm_data[row[data_id]]["data"] and "pm10" in pm_data[row[data_id]]["data"]:
					pm_time = pm_data[row[data_id]]['service']['timestamp']
					oldtime = now - pm_time
				
					if (oldtime <= 7200) :
						for pm in ['pm25', 'pm10']:
							gps_pm_data[pm] = pm_data[row[data_id]]["data"][pm]

						for loc in ['lat', 'lon']:	
							gps_pm_data[loc] = float(row[loc])

						result.append(gps_pm_data)
	
	return result

try : 
	gps_airkor_seoul_jeju_data = gps_airkor_seoul_jeju_info()
	gps_hcode_seoul_jeju_data = gps_hcode_seoul_jeju_info() # gps serial
	gps_oaq_seoul_data = gps_oaq_seoul_info() 
	gps_oaq_jeju_data = gps_oaq_jeju_info() 

except Exception as e:
	print(f"ERROR: gps:{e} ")


# Job to be scheduled
def job():
	print("job: start - " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

	nowdate = datetime.now().strftime('%Y%m%d%H%M')
	print("job: nowdate - " + nowdate)

	#airkorea air_code
	try : 
		pm_airkor_data = pm_airkorea_info()
		# hcode
		pm_hcode_data = pm_hcode_info()
		# oaq
		pm_oaq_seoul_data = pm_oaq_sensor_seoul_info()
		pm_oaq_jeju_data = pm_oaq_sensor_jeju_info()


		result = {
			"service" : {
				"id" : GPS_SERVICE_ID
			},
			"data" : send_data(gps_airkor_seoul_jeju_data, pm_airkor_data, 'air_code') +  send_data(gps_hcode_seoul_jeju_data, pm_hcode_data, 'dcode')
			+ send_data(gps_oaq_seoul_data, pm_oaq_seoul_data, 'serial')+ send_data(gps_oaq_jeju_data, pm_oaq_jeju_data, 'serial')
		}
		
		print(result)
		# rc.publish(redis_ir_channel, json.dumps(result))
		print("job: end - " + datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
		print("================================================")

	except Exception as e:
		sendTelegram('kiot:gps'+ e)
		print(f"ERROR: gps:{e} ")
# Main
if __name__ == '__main__':
	print("Started kiot-dashboard-stat-collector.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)
	try:
		job()

		schedule.every().hour.at(":15").do(job)
		schedule.every().hour.at(":30").do(job)
		schedule.every().hour.at(":55").do(job)

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
