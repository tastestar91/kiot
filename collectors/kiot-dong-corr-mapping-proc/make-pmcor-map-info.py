#!/usr/bin/env python3

#-------------------------------------------------------------------
# make-pmcor-map-info [Python3/TAB]
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

	sql_del = "DELETE FROM TB_PMCOR_MAP_INFO"

	sql_ins = """
INSERT INTO TB_PMCOR_MAP_INFO (
SELECT serial,air_code, CASE WHEN user_id='seoul' THEN 'D' ELSE 'O' END, ROUND(distance), CURRENT_TIMESTAMP FROM (
SELECT *, CASE @rowserial WHEN SERIAL THEN @rownum:=@rownum+1 ELSE @rownum:=1 END AS RNUM, @rowserial:=serial AS rowserial FROM (
SELECT TB_DONG_OAQ_INFO.serial, TB_DONG_AIRKOR_INFO.air_code, TB_DONG_OAQ_INFO.user_id, ST_DISTANCE_SPHERE(TB_DONG_OAQ_INFO.location, TB_DONG_AIRKOR_INFO.location) AS distance  FROM TB_DONG_OAQ_INFO, TB_DONG_AIRKOR_INFO
WHERE TB_DONG_AIRKOR_INFO.use_yn='Y'
ORDER BY TB_DONG_OAQ_INFO.serial, distance ) AS A, (SELECT @rowdcode:=0, @rownum:=0) AS R
) AS B                                                                          
WHERE RNUM <= 6                 
)
"""

	try:
		# MySQL
		mysql_connection = pymysql.connect(host='kiot5', user='kiot',
			password='zpdliot1!', db='re_kiot', charset='utf8mb4',
			cursorclass=pymysql.cursors.DictCursor)

		with mysql_connection.cursor() as cursor:
			cursor.execute(sql_del)
			cursor.execute(sql_ins)

		mysql_connection.commit()
		print("job: make dong map info success")

	except Exception:
		traceback.print_exc()

	finally:
		mysql_connection.close()


# Main
if __name__ == '__main__':
	print("Started make-pmcor-map-info.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)

	try:
		job()

	except (KeyboardInterrupt, SystemExit):
		print("Stopping make-dong-map-info.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped make-dong-map-info.")
