#!/usr/bin/env python3

#-------------------------------------------------------------------
# mqtt test [Python3/TAB]
#
# yskwon, 2020-04-19
#-------------------------------------------------------------------

import json
import signal
import sys
import traceback

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

	address = conf["servers"]["kwKiotCluster"]["mqtt"]["address"][0].split(":")
	mqtt_client.connect(address[0], int(address[1]), 60)
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
	client.subscribe("#")


def mqtt_on_message(client, userdata, msg):
	# TODO: Data processing

	# MQTT subscription
	# (Reference) https://pypi.org/project/paho-mqtt
	# (DEBUG): command:
	# $ mosquitto_pub -h kiot4 -p 38616 -t 'himpel/req/KWV-ST_00000' -m 'TESTING'
	topic = msg.topic
	message = msg.payload.decode()
	print(f"INFO: Received [{topic}] {message}")
	
# Main
if __name__ == '__main__':
	print("Started kys_mqtt.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)

	try:
		mqtt_client.on_connect = mqtt_on_connect
		mqtt_client.on_message = mqtt_on_message
		mqtt_client.loop_forever()
	except (KeyboardInterrupt, SystemExit):
		print("Stopping kys_mqtt.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped kys_mqtt.")
