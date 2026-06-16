#!/usr/bin/env python3

#-------------------------------------------------------------------
# K-Weather VENT Data Collector [Python3/TAB]
#
# Dongwoo Kwon {dwkwon80@gmail.com}, 2020-05-25
#-------------------------------------------------------------------

import json
import multiprocessing
import queue
import signal
import sys
import time
import traceback
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime

import paho.mqtt.client as mqtt
import requests


# Global constants
CONFIG_FILE = "/opt/apps/apps-config.json"
IR_SERVICE_ID = "kw-asbp1"
IR_SERVICE_ID_WATT = "kw-watt-asbp1"

MQTT_MSG_QUEUE_SIZE = 100000
MAX_SEND_WORKERS = 2

HTTP_TIMEOUT = (10, 58)		# (connection_timeout, read_timeout)
MQTT_KEEPALIVE = 120

MQTT_SUB_TOPICS = [
	("beems-aircon/ack/#", 0)
]	# [(topic, qos), ]

SENSOR_FIELDS = [
	"power", "op_mode", "air_volume", "filter_alarm", "set_temp", "temp"
]

ELECTRIC_SENSOR_FIELDS = [
	"watt_hour","watt"
]


# Load configurations and connect to a MQTT broker
try:
	with open(CONFIG_FILE, 'r') as f:
		conf = json.load(f)

	mqtt_client = mqtt.Client()
	mqtt_client.username_pw_set(
		conf["servers"]["kwKiotCluster"]["mqtt"]["username"],
		conf["servers"]["kwKiotCluster"]["mqtt"]["password"]
	)

	address = conf["servers"]["kwKiotCluster"]["mqtt"]["address"][1].split(":")
	mqtt_client.connect(address[0], int(address[1]), MQTT_KEEPALIVE)

	s = requests.Session()
	s.mount("http://", requests.adapters.HTTPAdapter(
		pool_connections=1, pool_maxsize=MAX_SEND_WORKERS))

	irApiUrl = "http://" + conf["collector"]["ingressRouter"]["address"][0]
	irApiUrl += conf["collector"]["ingressRouter"]["apiPathV1"]["sensors"]

	mqtt_msg_queue = queue.Queue(maxsize=MQTT_MSG_QUEUE_SIZE)
	resend_msg_queue = multiprocessing.Queue(
		maxsize=int(MQTT_MSG_QUEUE_SIZE/10))
	executor = ProcessPoolExecutor(max_workers=MAX_SEND_WORKERS)

except Exception as e:
	traceback.print_exc()
	sys.exit(1)


def receive_signal(signal_number, frame):
	print("Received signal: " + str(signal_number))
	sys.exit()


def release():
	mqtt_client.loop_stop()
	mqtt_client.disconnect()
	print("Disconnected from the MQTT broker")
	executor.shutdown(wait=True)
	s.close()


def checksum_modulo256(string):
	return hex(sum(string.encode('ascii')) % 256)[-1].upper()


def mqtt_on_connect(client, userdata, flags, rc):
	print(f"Connected with MQTT broker (result code: {rc})")
	client.subscribe(MQTT_SUB_TOPICS)
	print(f"Subscribed {MQTT_SUB_TOPICS}")


def mqtt_on_message(client, userdata, msg):
	mqtt_msg_queue.put(msg, block=True, timeout=None)
	qsize = mqtt_msg_queue.qsize()
	if (qsize % 1000 == 0):
		print(f"INFO: Queue size (appr.) = {qsize}/{MQTT_MSG_QUEUE_SIZE}")


def process_message(msg):
	try:
		reg_date = datetime.today().strftime("%Y%m%d%H%M")
		topic_tree = msg.topic.split("/")
		message = msg.payload.decode().lstrip()
		if message[-1] != "=":
			message += "="

		checksum = checksum_modulo256(message[:-2])
		if message[-2:-1] != checksum:
			raise Exception(f"Wrong checksum: {msg.topic}: {checksum}")	

		if topic_tree[0] == "beems-aircon":
			data_str = message[4:-2]
			data_header = message[0:4]

			if (data_header == 'STAT') :
				data_sensor = SENSOR_FIELDS
			else :
				data_sensor = ELECTRIC_SENSOR_FIELDS

		else:
			raise Exception(f"Unsupported model or topic: {msg.topic}")

		payload = { "serial": topic_tree[2], "reg_date": reg_date }

		if (data_header == "STAT"):
			payload[data_sensor[0]] = data_str[0:2] # power
			payload[data_sensor[1]] = data_str[2:4] # op_mode
			payload[data_sensor[2]] = data_str[4:6] # air_volume
			payload[data_sensor[3]] = data_str[6:8] # filter_alarm
			payload[data_sensor[4]] = data_str[8:13] # set_temp
			payload[data_sensor[5]] = data_str[13:18] # temp

		elif (data_header == "DATA"):
			payload[data_sensor[0]] = data_str[0:10] # watt_hour
			payload[data_sensor[1]] = data_str[10:18] # watt
		
		return payload
	except Exception as e:
		print(f"ERROR: {e}")
		return None


def send_message(payload): # 보낼 메세지
	try:
		if (payload.get("watt")):
			r = s.get(irApiUrl + "/" + IR_SERVICE_ID_WATT, params=payload, timeout=HTTP_TIMEOUT)
			r.raise_for_status()	
		else:
			r = s.get(irApiUrl + "/" + IR_SERVICE_ID, params=payload, timeout=HTTP_TIMEOUT)
			r.raise_for_status()
	except requests.exceptions.ConnectionError as e:
		try:
			resend_msg_queue.put_nowait(payload)
		except queue.Full:
			print(f"ERROR: {e}: Resend_msg_queue is full: {payload}")
	except Exception as e:
		print(f"ERROR: {e}: {payload}")


# Main
if __name__ == '__main__':
	print("Started K-Weather VENT Data Collector")

	try:
		signal.signal(signal.SIGHUP, receive_signal)
		signal.signal(signal.SIGTERM, receive_signal)
		signal.signal(signal.SIGQUIT, receive_signal)

		mqtt_client.on_connect = mqtt_on_connect
		mqtt_client.on_message = mqtt_on_message
		mqtt_client.loop_start()

		while True:
			try:
				msg = mqtt_msg_queue.get_nowait()
				payload = process_message(msg)
				if payload:
					executor.submit(send_message, payload)
			except queue.Empty:
				try:
					payload = resend_msg_queue.get_nowait()
					executor.submit(send_message, payload)
				except queue.Empty:
					time.sleep(0.001)
	except (KeyboardInterrupt, SystemExit):
		print("Stopping K-Weather VENT Data Collector. Please wait.")
	except Exception as e:
		print(f"ERROR: {e}")
	finally:
		release()
		print("Stopped K-Weather VENT Data Collector")
