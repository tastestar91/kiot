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


def redis_get(key_name):
	result = rc.get(key_name)
	print(f"SUCCESS: [Redis/GET]: {key_name}:{result}")
	#-------------------------------------------------------------------------

# Main
if __name__ == '__main__':
	print("Started kys_redis.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)

	try:
		if sys.argv[1] == 'help':
			print("iaq serial")
			print("oaq serial")
			print("fota serial")
			sys.exit()

		elif sys.argv[1] == 'iaq':
			key_name = "ingress-router/v1/memstore:kw/iaq/cmd/v1/" + sys.argv[2]

		elif sys.argv[1] == 'oaq':
			key_name = "ingress-router/v1/memstore:kw/oaq/pm/v1/" + sys.argv[2]

		elif sys.argv[1] == 'fota':
			key_name = "ingress-router/v1/memstore:kw/ctl/fota/v1/" + sys.argv[2]

		elif sys.argv[1] == 'group':
			key_name = "ir-sensor-data-monitor/v1/memstore:ir-mon/groups/v1/config"

		elif sys.argv[1] == 'merge':
			key_name = "ir-sensor-data-monitor/v1/memstore:ir-mon/merges/v1/config"

		elif sys.argv[1] == 'test':
			key_name = "ir-sensor-data-monitor/v1/memstore:ir/v1/sensors"

		redis_get(key_name)

	except (KeyboardInterrupt, SystemExit):
		print("Stopping kys_redis.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped kys_redis.")
