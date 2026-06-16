#!/usr/bin/env python3

#-------------------------------------------------------------------
# lbasapi-visitor-collector [Python3/TAB]
#
# yskwon, 2020-06-29
#-------------------------------------------------------------------

import json
import signal
import sys
import time
import traceback
from datetime import datetime

import requests
import schedule


# Global constants
CONFIG_FILE = "/opt/apps/apps-config.json"
IR_SERVICE_ID = "kw-osep1"

MAX_SEND_WORKERS = 20

HTTP_TIMEOUT = (10, 58)		# (connection_timeout, read_timeout)

SUNCHEON_CITY_SERIAL = [
	{ "region": 1, "serial": "OT3CL2000011" },
	{ "region": 2, "serial": "OT3CL2000010" },
	{ "region": 3, "serial": "OT3CL2000012" }
]
SUNCHEON_CITY_LBA_API = "https://master.lbasense.com/api/RealTime/FloatingPopulation?user=suncheon_city&pass=suncheon_city_123&site_id=5371"

POHANG_SERIAL = [
	{ "region": 1, "serial": "OC3CL2000046" },
	{ "region": 2, "serial": "OC3CL2000047" },
	{ "region": 3, "serial": "OC3CL2000048" }
]
POHANG_LBA_API = "https://master.lbasense.com/api/RealTime/FloatingPopulation?user=user_pohang&pass=user_pohang!!&site_id=4614"


# Load configurations and connect to a MQTT broker
try:
	with open(CONFIG_FILE, 'r') as f:
		conf = json.load(f)

	s = requests.Session()
	s.mount("http://", requests.adapters.HTTPAdapter(
		pool_connections=1, pool_maxsize=MAX_SEND_WORKERS))

	irApiUrl = "http://" + conf["collector"]["ingressRouter"]["address"][0]
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


def get_payload(row, timestamp, serial_arr):
	payload = None

	for oaq in serial_arr:
		if row['region'] == oaq['region']:
			payload = { "serial": oaq['serial'], "timestamp": timestamp, "visitor": row['numVisitors'] }
			break

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


def get_lba_data(url):
	print("get_lba_data: start, url={url}")

	rows = {}
	r = requests.get(url)
	if r.status_code == 200:
		rows = r.json()
	else:
		print(f"get_lba_data: fail, status_code={r.status_code}")

	print(f"get_lba_data: rows={len(rows)}")
	#print(f"get_lba_data: rows={rows}")

	return rows


def job():
	print("job: start")
	timestamp = (int(time.time()/600))*600
	print(f"INFO: timestamp: {timestamp} - {datetime.fromtimestamp(timestamp).strftime('%Y%m%d%H%M')}")

	print(f"INFO: SUNCHEON_CITY start")
	lba_info = get_lba_data(SUNCHEON_CITY_LBA_API)	
	for row in lba_info:
		payload = get_payload(row, timestamp, SUNCHEON_CITY_SERIAL)
		if payload:
			send_message(payload)
	print(f"INFO: SUNCHEON_CITY end")

	print(f"INFO: POHANG start")
	lba_info = get_lba_data(POHANG_LBA_API)	
	for row in lba_info:
		payload = get_payload(row, timestamp, POHANG_SERIAL)
		if payload:
			send_message(payload)
	print(f"INFO: POHANG end")

	print("job: end")


# Main
if __name__ == '__main__':
	print("Started lbasapi-visitor-collector")

	try:
		signal.signal(signal.SIGHUP, receive_signal)
		signal.signal(signal.SIGTERM, receive_signal)
		signal.signal(signal.SIGQUIT, receive_signal)

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
		print("Stopping lbasapi-visitor-collector. Please wait.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped lbasapi-visitor-collector")
