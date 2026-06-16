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


def test_group():
	new_data = {
		"kw-vsep1": [
			{
				"from": "kw-vsep1",
				"to": "kw-vskp1"
			}
		],
		"kw-vskp1": [
			{
				"from": "kw-vsep1",
				"to": "kw-vskp1"
			}
		]
	}

	new_data_str = json.dumps(new_data)

	#----- Publish data to a Redis channel -----------------------------------
	channel_name = "ir-sensor-data-monitor/v1/redissubupdater.put:ir-mon/merges/v1/update"

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
		test_group()
	except (KeyboardInterrupt, SystemExit):
		print("Stopping kys_redis.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped kys_redis.")
