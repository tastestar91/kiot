#!/usr/bin/env python3

#-------------------------------------------------------------------
# MQTT BEEMS [Python3/TAB]
#
# 2022-03-30
# kys-test-mqtt.py 참조
#-------------------------------------------------------------------

import json
import signal
import sys
import time
import traceback
import random
import datetime

import schedule
import paho.mqtt.client as mqtt

# Global constants
CONFIG_FILE = "/opt/apps/apps-config.json"

# Test Type
# 1: 1초에 몇 건 전송하는지 알아보는 테스트
# 2: 1000건 전송할 때 수신성공확률을 알아보는 테스트
TEST_TYPE = 1

# Load configurations and start a redis cluster client
try:
	with open(CONFIG_FILE, 'r') as f:
		conf = json.load(f)

	# MQTT
	mqtt_client = mqtt.Client()
	mqtt_client.username_pw_set(
		conf["servers"]["kwKiotCluster"]["mqtt"]["username"],
		conf["servers"]["kwKiotCluster"]["mqtt"]["password"]
	)

	address = conf["servers"]["kwKiotCluster"]["mqtt"]["address"][1].split(":")
	print(address)
	mqtt_client.connect(address[0], int(address[1]), 50)
	#print(address[0])
	#print(address[1])
except Exception:
	traceback.print_exc()
	sys.exit(1)


def receive_signal(signal_number, frame):
	print("Received signal: " + str(signal_number))
	sys.exit()


def release():
	print("Disconnected from all servers and released all resources")
	# TODO: Close server connections and release all resources
	mqtt_client.disconnect()


def mqtt_on_connect(client, userdata, flags, rc):
	print(f"Connected with MQTT broker (result code: {rc})")
	# TODO: Change a mqtt topic


def mqtt_send_status():
	cnt = 0
	period_for_testing = 1
	print("mqtt sending start...")
	start_time = datetime.datetime.now()
	print(start_time)
	start_time = float(str(start_time).split(":")[2])
	while True:
		cnt += 1
		passed_time = float(str(datetime.datetime.now()).split(":")[2]) - start_time
		if TEST_TYPE == 1:
			if passed_time > period_for_testing:
				print(f"passed time: {passed_time}")
				print("process end...")
				print(f"number of mqtt sent: {cnt}")
				sys.exit()
				return
			else:
				pass
		elif TEST_TYPE == 2:
			if cnt == 1000:
				print(f"passed time: {passed_time}")
				print("process end...")
				print(f"number of mqtt sent: {cnt}")
				sys.exit()
				return
			else:
				pass
		topic = 'beems/ack/BEEMS22000001'
		ch1_current = -25
		ch1_power = 123
		ch1_sum = 3155
		ch2_current = -7
		ch2_power = 100
		ch2_sum = 50000
		command = f'STAT{ch1_current}&{ch1_power}&{ch2_current}&{ch2_power}&{ch1_sum}&{ch2_sum}'
		checksum=hex(sum(command.encode('ascii')) % 256)   #보기) 0xdc, 0x46, 0x49, 0xaf,...
		message = command+checksum[-1].upper()
		mqtt_client.publish(topic, message)
		print(f"{datetime.datetime.now()}: Publish [{topic}] {message}")
			#if cnt>99:
			#	break

# Main
if __name__ == '__main__':
	print("Started kys_mqtt.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)

	try:
		mqtt_client.on_connect = mqtt_on_connect
		mqtt_send_status() #
		schedule.every().seconds.do(mqtt_send_status)

		while True:
			schedule.run_pending()
			time.sleep(0.000001) #

	except (KeyboardInterrupt, SystemExit):
		print("Stopping kys_mqtt.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped kys_mqtt.")
