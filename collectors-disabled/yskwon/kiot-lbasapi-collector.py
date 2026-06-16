#!/usr/bin/env python3

#-------------------------------------------------------------------
# kiot-lbasapi-collector [Python3/TAB]
#
# yskwon, 2020-05-07
#-------------------------------------------------------------------

import json
import signal
import sys
import time
import datetime
import traceback
import schedule
import requests

# Global constants
CONFIG_FILE = "/opt/apps/apps-config.json"


# Load configurations
try:
	with open(CONFIG_FILE, 'r') as f:
		conf = json.load(f)

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


# Job to be scheduled
def job_lbsapi(oaq_serial):
	nowdate = datetime.datetime.now().strftime('%Y%m%d%H%M')
	print("job_last: nowdate - " + nowdate)

	r = requests.get('http://220.95.232.212:8888/api/dashboard/receive/cnt')
	print("job_last: %s" % str(r.content))
	if r.status_code == 200 and r.json()['status'] == 'SUCCESS':
		print("total.allCnt: %s" % str(r.json()['data']['total']['allCnt']))
	else:
		print("job_last: api status: fail")

# Main
if __name__ == '__main__':
	print("Started kiot-lbasapi-collector.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)

	try:
		# Schedule a job every hour
		# (Reference) https://pypi.org/project/schedule
#schedule.every(10).minutes.do(job_last)
#schedule.every().hour.at(":00").do(job_log)
		job_last()
		job_log()

		while True:
			schedule.run_pending()
			time.sleep(1)
	except (KeyboardInterrupt, SystemExit):
		print("Stopping kiot-lbasapi-collector.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped kiot-lbasapi-collector.")
