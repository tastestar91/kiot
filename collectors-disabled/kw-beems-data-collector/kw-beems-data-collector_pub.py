#!/usr/bin/env python3

#-------------------------------------------------------------------
# MQTT TEST [Python3/TAB]
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
	#cnt = 0
	#while True:
	topic = 'beems/ack/BEEMS22000001'
	command = 'STAT010%d00000000' % random.randint(1,6) #이 값은?
	checksum=hex(sum(command.encode('ascii')) % 256)
	message = command+checksum[-1].upper()+"="
	mqtt_client.publish(topic, message)
	print(f"{datetime.datetime.now()}: Puslish [{topic}] {message}")
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
		schedule.every(0.1).minutes.do(mqtt_send_status) #전송주기 설정
        
		while True:
			schedule.run_pending()
			time.sleep(1) #

	except (KeyboardInterrupt, SystemExit):
		print("Stopping kys_mqtt.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped kys_mqtt.")
