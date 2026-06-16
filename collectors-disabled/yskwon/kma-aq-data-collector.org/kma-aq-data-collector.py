#!/usr/bin/env python3

#-------------------------------------------------------------------
# KMA Air Quality Data Collector [Python3/TAB]
#
# Dongwoo Kwon {dwkwon80@gmail.com}, 2020-05-12
#-------------------------------------------------------------------

import json
import signal
import sys
import time
import traceback
from datetime import datetime

import pymysql.cursors
import requests
import schedule
from rediscluster import RedisCluster


# Global constants
CONFIG_FILE = "/opt/apps/apps-config.json"
UPDATE_STATUS_FILE = "update.json"
HTTP_TIMEOUT = (10, 58)     # (connection_timeout, read_timeout)
MYSQL_DEFAULT_FETCH_ROWS = 20

PSEUDO_SERVICE_ID = "kma-aq"
REDIS_CHANNEL_NAME = "kma/weather/dong/aq"

KMA_AQ_METRIC_PREFIX = "test.kma-aq."
KMA_AQ_SENSOR_FIELDS = [
	{ "field": "pm10_value", "sensor_name": "pm10" },
	{ "field": "pm10_grade", "sensor_name": "pm10_grade" },
	{ "field": "pm25_value", "sensor_name": "pm25" },
	{ "field": "pm25_grade", "sensor_name": "pm25_grade" }
]


# Load configurations and start a redis cluster client
try:
	with open(CONFIG_FILE, 'r') as f:
		conf = json.load(f)

	# MySQL
	address = conf["servers"]["kwKiotCluster"]["mysql"]["address"][0].split(":")
	username = conf["servers"]["kwKiotCluster"]["mysql"]["username"]
	password = conf["servers"]["kwKiotCluster"]["mysql"]["password"]

	mysql_connection = pymysql.connect(host=address[0], port=int(address[1]),
		user=username, password=password, db="re_kiot", charset='utf8mb4',
		cursorclass=pymysql.cursors.DictCursor, autocommit=True)

	# Redis
	redis_startup_nodes = []
	for address in conf["servers"]["kwKiotCluster"]["redis"]["address"][0].split(","):
		address = address.split(":")
		redis_startup_nodes.append({"host": address[0], "port": address[1]})

	rc = RedisCluster(startup_nodes=redis_startup_nodes, decode_responses=True,
		password=conf["servers"]["kwKiotCluster"]["redis"]["password"])

	redis_ir_channel = conf["collector"]["redis"]["dataChannelV1"]["get"] + REDIS_CHANNEL_NAME

	# OpenTSDB WO
	s = requests.Session()
	# In a multithreaded environment, pool_maxsize must be increased
	s.mount("http://",
		requests.adapters.HTTPAdapter(pool_connections=1, pool_maxsize=1))

	tsdb_query_url = "http://" + conf["servers"]["kwKiotCluster"]["opentsdbWo"]["address"][0] + "/api/put"

	# Load a last updated time from the file
	try:
		with open(UPDATE_STATUS_FILE, 'r') as f:
			last_updated_datetime = json.load(f)["lastUpdatedDatetime"]
	except OSError as e:
		print(f"ERROR: {e}")
		# Default last_updated_datetime is 5 minutes ago
		last_updated_datetime = datetime.fromtimestamp(
			(int(time.time() / 60) - 5) * 60).strftime("%Y%m%d%H%M")
		print(f"INFO: Set default lastUpdatedDatetime: {last_updated_datetime}")
except Exception:
	traceback.print_exc()
	sys.exit(1)


def receive_signal(signal_number, frame):
	print("Received signal: " + str(signal_number))
	sys.exit()


def release():
	print("Disconnected from all servers and released all resources")
	mysql_connection.close()
	s.close()


def send_to_tsdb(rows):
	queries = []
	latest_datetime = ""

	for row in rows:
		metric = f"{KMA_AQ_METRIC_PREFIX}{row['dcode']}"
		timestamp = int(time.mktime(
			datetime.strptime(row["up_date"], "%Y%m%d%H%M").timetuple()))

		for sensor in KMA_AQ_SENSOR_FIELDS:
			queries.append({
				"metric": metric,
				"timestamp": timestamp,
				"value": row[sensor["field"]],
				"tags": {
					"map_type": row["map_type"],
					"sensor": sensor["sensor_name"]
				}
			})

		if row["up_date"] > latest_datetime:
			latest_datetime = row["up_date"]

	r = s.post(tsdb_query_url, data=json.dumps(queries), timeout=HTTP_TIMEOUT)
	r.raise_for_status()

	return latest_datetime


def publish_to_redis(max_db_dt, rows):
	ir_data = {
		"service": {
			"id": PSEUDO_SERVICE_ID,
			"timestamp": int(time.mktime(
				datetime.strptime(max_db_dt, "%Y%m%d%H%M").timetuple()))
		}
	}

	for row in rows:
		if max_db_dt != row["up_date"]:
			continue

		ir_data["service"]["deviceId"] = row["dcode"]
		ir_data["data"] = {}
		for sensor in KMA_AQ_SENSOR_FIELDS:
			ir_data["data"][sensor["sensor_name"]] = row[sensor["field"]]

		rc.publish(redis_ir_channel, json.dumps(ir_data))


# Job to be scheduled
def job():
	global last_updated_datetime

	with mysql_connection.cursor() as cursor:
		try:
			sql = "SELECT MAX(`up_date`) FROM `TB_DONG_DUST_DATA`;"
			cursor.execute(sql)
			max_db_dt = cursor.fetchone()["MAX(`up_date`)"]
			if max_db_dt <= last_updated_datetime:
				print(f"SUCCESS: [MYSQL/SELECT]: No new rows in DB. Last updated = {last_updated_datetime}")
				return

			sql = "SELECT * FROM `TB_DONG_DUST_DATA` WHERE `up_date` > %s;"
			cursor.execute(sql, (last_updated_datetime))
			print(f"SUCCESS: [MYSQL/SELECT]: Found new rows in DB.")

			count = 0
			while True:
				rows = cursor.fetchmany(MYSQL_DEFAULT_FETCH_ROWS)
				if not rows:
					break
				count += len(rows)

				dt = send_to_tsdb(rows)
				publish_to_redis(max_db_dt, rows)
				if dt > last_updated_datetime:
					last_updated_datetime = dt
					try:
						with open(UPDATE_STATUS_FILE, 'w') as f:
							f.write("{ \"lastUpdatedDatetime\": \"%s\" }" % dt)
							f.flush()
					except OSError as e:
						print(f"ERROR: {e}")

			print(f"SUCCESS: [OpenTSDB/PUT][Redis/PUB]: Updated new {count} rows. Last updated = {last_updated_datetime}")
		except Exception as e:
			print(e)


# Main
if __name__ == '__main__':
	print("Started KMA Air Quality Data Collector.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)

	try:
		schedule.every(5).minutes.do(job)

		# (DEBUG): Schedule a job every few seconds
		#schedule.every(2).seconds.do(job)
		
		while True:
			schedule.run_pending()
			time.sleep(1)
	except (KeyboardInterrupt, SystemExit):
		print("Stopping KMA Air Quality Data Collector.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped KMA Air Quality Data Collector.")
