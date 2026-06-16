#!/usr/bin/env python3

#-------------------------------------------------------------------
# add-oaq-info [Python3/TAB]
#
# yskwon, 2020-06-04
#-------------------------------------------------------------------

import json
import signal
import sys
import time
import datetime
import traceback

import pymysql.cursors


def receive_signal(signal_number, frame):
	print("Received signal: " + str(signal_number))
	sys.exit()


def release():
	print("Disconnected from all servers and released all resources")


def job():
	nowdate = datetime.datetime.now().strftime('%Y%m%d%H%M')
	print("job: nowdate - " + nowdate)


	sql = """
INSERT INTO TB_DONG_OAQ_INFO (
SELECT TB_DEVICE.serial_num, 'kiot' user_id, '' user_name,
TB_MEMBER_DEVICE_MANAGE.lat, TB_MEMBER_DEVICE_MANAGE.lon,
ST_POINTFROMTEXT(CONCAT('POINT(',TB_MEMBER_DEVICE_MANAGE.lon, ' ', TB_MEMBER_DEVICE_MANAGE.lat, ')'), 4326),
CURRENT_TIMESTAMP, 'Y'
FROM TB_DEVICE, TB_MEMBER_DEVICE_MANAGE
WHERE TB_DEVICE.serial_num IN (
'OT3CL2000010',
'OT3CL2000011',
'OT3CL2000012'
) AND TB_DEVICE.idx=TB_MEMBER_DEVICE_MANAGE.device_idx
)
"""

	try:
		# MySQL
		mysql_connection = pymysql.connect(host='kiot5', user='kiot',
			password='zpdliot1!', db='re_kiot', charset='utf8mb4',
			cursorclass=pymysql.cursors.DictCursor)

		with mysql_connection.cursor() as cursor:

			cursor.execute(sql)

		mysql_connection.commit()
		print("job: add-oaq-info success")

	except Exception:
		mysql_connection.j()
		traceback.print_exc()

	finally:
		mysql_connection.close()


# Main
if __name__ == '__main__':
	print("Started add-oaq-info.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)

	try:
		job()

	except (KeyboardInterrupt, SystemExit):
		print("Stopping add-oaq-info.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped add-oaq-info.")
