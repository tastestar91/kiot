#!/usr/bin/env python3

#-------------------------------------------------------------------
# Test-sample-collector_mqtt-to-redis [Python3/TAB]
#
# Dongwoo Kwon {dwkwon80@gmail.com}, 2020-04-19
#-------------------------------------------------------------------

import json
import signal
import sys
import traceback

import paho.mqtt.client as mqtt
from rediscluster import RedisCluster


# Global constants
CONFIG_FILE = "/opt/apps/apps-config.json"


# Load configurations and start a redis cluster client
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
	client.subscribe("himpel/req/#")


def mqtt_on_message(client, userdata, msg):
	# TODO: Data processing

	# MQTT subscription
	# (Reference) https://pypi.org/project/paho-mqtt
	# (DEBUG): command:
	# $ mosquitto_pub -h kiot4 -p 38616 -t 'himpel/req/KWV-ST_00000' -m 'TESTING'
	topic = msg.topic
	message = msg.payload.decode()
	print(f"INFO: Received [{topic}] {message}")
	
	new_data = {
		"serial": "V02Q1940046",
		"update": 1585636200,
		"sensors": {
			"pm10": {
				"offset": 16.56,
				"ratio": 1.85
			},
			"pm25": {
				"offset": 1.63,
				"ratio": 0.25
			}
		}
	}

	new_data_str = json.dumps(new_data)

	#----- Store key-value data in Redis -------------------------------------
	key_name = "ingress-router/v1/memstore:kw/oaq/pm/v1/" + new_data["serial"]

	rc.set(key_name, new_data_str)
	result = rc.get(key_name)
	print(f"SUCCESS: [Redis/GET]: {key_name}:{result}")
	#-------------------------------------------------------------------------

	
	#----- Publish data to a Redis channel -----------------------------------
	channel_name = "ingress-router/v1/memstore.put:kw/iaq/cmd/v1/" + new_data["serial"]

	# (DEBUG): command:
	# $ redis-cli -h kiot1 -p 36379 psubscribe ingress-router/v1/memstore.put:kw/iaq/cmd/v1/*
	rc.publish(channel_name, new_data_str)
	print(f"SUCCESS: [Redis/PUB]: " + channel_name)
	#-------------------------------------------------------------------------


# Main
if __name__ == '__main__':
	print("Started test-sample-collector.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)

	try:
		mqtt_client.on_connect = mqtt_on_connect
		mqtt_client.on_message = mqtt_on_message
		mqtt_client.loop_forever()
	except (KeyboardInterrupt, SystemExit):
		print("Stopping test-sample-collector.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped test-sample-collector.")
