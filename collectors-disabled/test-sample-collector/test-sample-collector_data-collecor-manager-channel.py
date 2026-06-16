#!/usr/bin/env python3

#-------------------------------------------------------------------
# Test-sample-collector_data-collecor-manager-channel [Python3/TAB]
#
# Dongwoo Kwon {dwkwon80@gmail.com}, 2020-04-17
#-------------------------------------------------------------------

import json
import signal
import sys
import time
import traceback

import schedule
from rediscluster import RedisCluster


# Global constants
CONFIG_FILE = "/opt/apps/apps-config.json"
# TODO: Change a collector name
COLLECTOR_NAME = "test-sample-collector_data-collecor-manager-channel"


# Load configurations and start a redis cluster client
try:
	with open(CONFIG_FILE, 'r') as f:
		conf = json.load(f)

	redis_startup_nodes = []
	for address in conf["collector"]["redis"]["address"][0].split(","):
		address = address.split(":")
		redis_startup_nodes.append({"host": address[0], "port": address[1]})

	rc = RedisCluster(startup_nodes=redis_startup_nodes, decode_responses=True,
		password=conf["collector"]["redis"]["password"])

	redis_post_channel = \
		conf["collector"]["redis"]["dataChannelV1"]["post"] + COLLECTOR_NAME
except Exception:
	traceback.print_exc()
	sys.exit(1)


def receive_signal(signal_number, frame):
	print("Received signal: " + str(signal_number))
	sys.exit()


def release():
	print("Disconnected from all servers and released all resources")
	# TODO: Close server connections and release all resources


# Send data to the Redis channel subscribed by Data-collector-manager
def send_data(service_id, data):
	ir_data = {
		"timestamp": int(time.time()),
		"dataset": [
			{
				"service": {"id": service_id},
				"data": data
			}
		]
	}

	rc.publish(redis_post_channel, json.dumps(ir_data))
	print(f"SUCCESS: [Redis/PUB]: {redis_post_channel}")


# Process data
def process_data():
	# TODO: Data processing
	data = {
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

	return data


# Job to be scheduled
def job():
	new_data = process_data()

	#----- Store key-value data in Redis -------------------------------------
	key_name = "ingress-router/v1/memstore:kw/oaq/pm/v1/" + new_data["serial"]

	# Redis key/value store --> [ {KEY: VALUE}, {KEY: VALUE}, ... ]
	postdata = [
		{
			"key": key_name,
			"value": new_data
		}
	]

	# Service ID 'server_kwkiotcluster-redis' is used to store key-value data
	send_data("server_kwkiotcluster-redis", postdata)
	#-------------------------------------------------------------------------

	
	#----- Publish data to a Redis channel -----------------------------------
	channel_name = "ingress-router/v1/memstore.put:kw/iaq/cmd/v1/" + \
		new_data["serial"]

	# Redis-pub --> [ {CHANNEL: DATA}, {CHANNEL: DATA}, ... ]
	postdata = [
		{
			"channel": channel_name,
			"data": new_data
		}
	]

	# Service ID 'server_kwkiotcluster-redis-pub' is used to publish data
	send_data("server_kwkiotcluster-redis-pub", postdata)
	#-------------------------------------------------------------------------


# Main
if __name__ == '__main__':
	print("Started test-sample-collector.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)

	try:
		# Schedule a job every hour
		# (Reference) https://pypi.org/project/schedule
		schedule.every().hour.do(job)

		# (DEBUG): Schedule a job every few seconds
		schedule.every(5).seconds.do(job)
		
		while True:
			schedule.run_pending()
			time.sleep(1)
	except (KeyboardInterrupt, SystemExit):
		print("Stopping test-sample-collector.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped test-sample-collector.")
