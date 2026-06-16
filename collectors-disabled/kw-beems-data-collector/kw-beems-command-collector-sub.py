#!/usr/bin/env python3

#-------------------------------------------------------------------
# MQTT BEEMS [Python3/TAB]
#
# 2022-04-13
# kw-vent-data-collector.py 참조
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
IR_SERVICE_ID = "kw-bstp1"

MQTT_MSG_QUEUE_SIZE = 100000
MAX_SEND_WORKERS = 20

HTTP_TIMEOUT = (10, 58)		# (connection_timeout, read_timeout)
MQTT_KEEPALIVE = 120

MQTT_SUB_TOPICS = [
	("beems/req/#", 0)
]	# [(topic, qos), ]

SENSOR_FIELDS = [
	"ai_mode", "action_command"
]

fieldDelimiter = "&"
nullData = "NA"

# Load configurations and connect to a MQTT broker
try:
	with open(CONFIG_FILE, 'r') as f:
		conf = json.load(f)

	mqtt_client = mqtt.Client()
	mqtt_client.username_pw_set(
		conf["servers"]["kwKiotCluster"]["mqtt"]["username"],
		conf["servers"]["kwKiotCluster"]["mqtt"]["password"]
	)

	address = conf["servers"]["kwKiotCluster"]["mqtt"]["address"][1].split(":") #kiot5
	print(address)
	mqtt_client.connect(address[0], int(address[1]), MQTT_KEEPALIVE)
	print(mqtt_client)

	s = requests.Session()
	s.mount("http://", requests.adapters.HTTPAdapter(
		pool_connections=1, pool_maxsize=MAX_SEND_WORKERS))

	irApiUrl = "http://" + conf["collector"]["ingressRouter"]["address"][0] #필요없음
	irApiUrl += conf["collector"]["ingressRouter"]["apiPathV1"]["sensors"] #필요없음
	irApiUrl += "/" + IR_SERVICE_ID #필요없음

	mqtt_msg_queue = queue.Queue(maxsize=MQTT_MSG_QUEUE_SIZE)
	print(mqtt_msg_queue)
	resend_msg_queue = multiprocessing.Queue(
		maxsize=int(MQTT_MSG_QUEUE_SIZE/10))
	executor = ProcessPoolExecutor(max_workers=MAX_SEND_WORKERS)
	print(executor)
	
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
	print(f"how many times of command from API: {qsize}")
	if (qsize % 1000 == 0):
		print(f"INFO: Queue size (appr.) = {qsize}/{MQTT_MSG_QUEUE_SIZE}")


def process_message(msg):
	try:
		reg_date = datetime.today().strftime("%Y%m%d%H%M")
		topic_tree = msg.topic.split("/")
		message = msg.payload.decode().lstrip()
		print(f"command: {message}")

		if topic_tree[0] == "beems":
			data_str = message[4:6]+fieldDelimiter+message[6:8]
			data_sensor = SENSOR_FIELDS

		payload = { "serial": topic_tree[2], "reg_date": reg_date }
		for i in range(0, len(data_sensor)):
			if data_str.split(fieldDelimiter)[i] != nullData:
				payload[data_sensor[i]] = data_str.split(fieldDelimiter)[i]
		return payload
	except Exception as e:
		print(f"ERROR: {e}")
		return None


def send_message(payload):
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
		
		cnt = 0
		while True:
			try:
				msg = mqtt_msg_queue.get_nowait()
				cnt += 1
				payload = process_message(msg)
				print(payload)
				print(cnt)
			except queue.Empty:
				try:
					payload = resend_msg_queue.get_nowait()
					executor.submit(send_message, payload)
				except queue.Empty:
					time.sleep(0.001)  #원본은 0.001
					#예를 들어, 루프 대기시간인 1초 간격보다 빠르게 명령문을 2번 전송하면(Postman에서 Send 두 번 클릭) qsize는 2가 되고, 그러지 않으면 각각 1인 qsize를 두 번 얻는다.
	except (KeyboardInterrupt, SystemExit):
		print("Stopping K-Weather VENT Data Collector. Please wait.")
	except Exception as e:
		print(f"ERROR: {e}")
	finally:
		release()
		print("Stopped K-Weather VENT Data Collector")
