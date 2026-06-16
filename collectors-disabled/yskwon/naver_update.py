#!/usr/bin/env python3

#-------------------------------------------------------------------
# naver update [Python3/TAB]
#
# yskwon, 2021-08-27
#-------------------------------------------------------------------

import json
import signal
import sys
import time
import traceback
from datetime import datetime

import requests
import schedule
import random


# Global constants
CONFIG_FILE = "/opt/apps/apps-config.json"
IR_SERVICE_ID = "kw-isup1"

MAX_SEND_WORKERS = 20

HTTP_TIMEOUT = (10, 58)		# (connection_timeout, read_timeout)


# Load configurations and connect to a MQTT broker
try:
	with open(CONFIG_FILE, 'r') as f:
		conf = json.load(f)

	s = requests.Session()
	s.mount("http://", requests.adapters.HTTPAdapter(
		pool_connections=1, pool_maxsize=MAX_SEND_WORKERS))

	#irApiUrl = "http://" + conf["collector"]["ingressRouter"]["address"][0]
	irApiUrl = "http://kiot1:40001"
	irApiUrl += conf["collector"]["ingressRouter"]["apiPathV1"]["sensors"]
	irApiUrl += "/" + IR_SERVICE_ID

except Exception as e:
	traceback.print_exc()
	sys.exit(1)


def receive_signal(signal_number, frame):
	print("Received signal: " + str(signal_number))
	sys.exit()


def release():
	print("Disconnected from all servers and released all resources")
	s.close()


def get_payload(timestamp, data):
	payload = None

	if data['pm10'] > 100 or data['pm25'] > 100:
		#print(f"get_payload: {timestamp} - {data}")
		payload = data
		payload['pm10'] = int(random.uniform(41,53))
		payload['pm25'] = int(random.uniform(28,33))
		payload['pm01'] = int(random.uniform(41,53))
		payload['pm10_raw'] = payload['pm10']
		payload['pm25_raw'] = payload['pm25']
		payload['pm01_raw'] = payload['pm01']
		#print(f"get_payload: payload - {payload}")

	return payload


def send_message(payload):
	print(f"send_message: payload={payload}")
	try:
		r = s.get(irApiUrl, params=payload, timeout=HTTP_TIMEOUT)
		r.raise_for_status()
	except requests.exceptions.ConnectionError as e:
		try:
			resend_msg_queue.put_nowait(payload)
		except queue.Full:
			print(f"ERROR: {e}: Resend_msg_queue is full: {payload}")
	except Exception as e:
		print(f"ERROR: {e}: {payload}")


def get_iaq_data():
	print("get_iaq_data: start")

	rows = {}
	r = requests.get('http://kiototsdb.kweather.co.kr:24242/api/query?start=2021/07/01-11:30:00&end=2021/07/01-23:00:00&m=sum:kw-iaq-sensor-kiot{serial=ISC0W2000009,sensor=tm|temp|humi|co2|voc|noise|pm10|pm25|pm01|o3|co|no2|hcho|atm|pm10_raw|pm25_raw|pm01_raw}')
	if r.status_code == 200:
		json_data = r.json()
		for data in json_data:
			#print(f"get_iaq_data: data={data}")
			for dps in data['dps']:
				#print(f"get_iaq_data: dps={dps} - {data['dps'][dps]}")
				if dps in rows:
					rows[dps][data['tags']['sensor']] = data['dps'][dps]
				else:
					rows[dps] = {}
					rows[dps]['serial'] = data['tags']['serial']
					rows[dps]['timestamp'] = int(dps)
					rows[dps][data['tags']['sensor']] = data['dps'][dps]
	else:
		print(f"get_iaq_data: fail, status_code={r.status_code}")

	#print(f"get_iaq_data: rows={rows}")
	print(f"get_iaq_data: rows={len(rows)}")

	return rows


def job():
	print("job: start")
	timestamp = (int(time.time()/600))*600
	print(f"INFO: timestamp: {timestamp} - {datetime.fromtimestamp(timestamp).strftime('%Y%m%d%H%M')}")

	iaq_data = get_iaq_data()	
	for row in iaq_data:
		payload = get_payload(row, iaq_data[row])
		if payload:
			send_message(payload)

	print("job: end")



# Main
if __name__ == '__main__':
	print("Started naver iaq update")

	try:
		signal.signal(signal.SIGHUP, receive_signal)
		signal.signal(signal.SIGTERM, receive_signal)
		signal.signal(signal.SIGQUIT, receive_signal)

		#job()

	except (KeyboardInterrupt, SystemExit):
		print("Stopping naver iaq update. Please wait.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped naver iaq update")
