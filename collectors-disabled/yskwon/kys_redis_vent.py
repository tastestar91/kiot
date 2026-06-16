#!/usr/bin/env python3

#-------------------------------------------------------------------
# redis test [Python3/TAB]
#
# yskwon, 2020-04-19
#-------------------------------------------------------------------

import json
import signal
import sys
import traceback

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

except Exception:
	traceback.print_exc()
	sys.exit(1)


def receive_signal(signal_number, frame):
	print("Received signal: " + str(signal_number))
	sys.exit()


def release():
	print("Disconnected from all servers and released all resources")
	# TODO: Close server connections and release all resources


def iaq_set_vent():
	new_data = {
		"serial": "ICW0W2001088",
		"update": 1617239759,
		"ai_mode_devices": 1,
		"vent": [
			{
			"model": "KWV-AIC1",
			"serial": "KWV-AIC1_9900002",
			"ai_mode": 1,
			"channel": {
				"req": "kaic1/req/KWV-AIC1_9900002"
				}
			}
		]
	}

	new_data_str = json.dumps(new_data)

	#----- Store key-value data in Redis -------------------------------------
	key_name = "ingress-router/v1/memstore:kw/iaq/cmd/v1/" + new_data["serial"]

	rc.set(key_name, new_data_str)
	result = rc.get(key_name)
	print(f"SUCCESS: [Redis/GET]: {key_name}:{result}")
	#-------------------------------------------------------------------------

	
	#----- Publish data to a Redis channel -----------------------------------
	channel_name = "ingress-router/v1/memstore.put:kw/iaq/cmd/v1/" + new_data["serial"]

	rc.publish(channel_name, new_data_str)
	print(f"SUCCESS: [Redis/PUB]: " + channel_name)
	#-------------------------------------------------------------------------


# Main
if __name__ == '__main__':
	print("Started kys_redis.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)

	try:
		iaq_set_vent()
	except (KeyboardInterrupt, SystemExit):
		print("Stopping kys_redis.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped kys_redis.")
