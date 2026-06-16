#!/usr/bin/env python3

#-------------------------------------------------------------------
# Test-sample-collector_mysql-to-redis [Python3/TAB]
#
# Dongwoo Kwon {dwkwon80@gmail.com}, 2020-04-19
#-------------------------------------------------------------------

import json
import signal
import sys
import time
import traceback

import pymysql.cursors
import schedule
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

	# MySQL
	mysql_connection = pymysql.connect(host='kiot5', user='kiot',
		password='zpdliot1!', db='test', charset='utf8mb4',
		cursorclass=pymysql.cursors.DictCursor)
except Exception:
	traceback.print_exc()
	sys.exit(1)


def receive_signal(signal_number, frame):
	print("Received signal: " + str(signal_number))
	sys.exit()


def release():
	print("Disconnected from all servers and released all resources")
	# TODO: Close server connections and release all resources
	mysql_connection.close()


# Process data
def process_data():
	# TODO: Data processing
	
	# MySQL simple example
	# (Reference) https://pypi.org/project/PyMySQL
	with mysql_connection.cursor() as cursor:
		sql = "SELECT * FROM `reptest` WHERE `number`=%s"
		cursor.execute(sql, ('100',))
		result = cursor.fetchone()
		print(f"SUCCESS: [MySQL/SELECT]: {result}")

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
		# Schedule a job every hour
		# (Reference) https://pypi.org/project/schedule
		schedule.every().hour.do(job)

		# (DEBUG): Schedule a job every few seconds
		schedule.every(2).seconds.do(job)
		
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
