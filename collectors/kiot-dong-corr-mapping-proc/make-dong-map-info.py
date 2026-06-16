#!/usr/bin/env python3

#-------------------------------------------------------------------
# make-dong-map-info [Python3/TAB]
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

	sql_seoul_del = "DELETE FROM TB_DONG_MAP_INFO WHERE dcode LIKE '11%'"

	sql_seoul_oaq_ins = """
INSERT INTO TB_DONG_MAP_INFO  (
SELECT dcode,SERIAL, CASE WHEN user_id='seoul' THEN 'D' ELSE 'O' END, ROUND(distance), CURRENT_TIMESTAMP FROM (
SELECT *, CASE @rowdcode COLLATE utf8mb4_unicode_ci WHEN dcode THEN @rownum:=@rownum+1 ELSE @rownum:=1 END AS RNUM, @rowdcode:=dcode AS rowdcode FROM (
SELECT TB_DONG_INFO.dcode, TB_DONG_OAQ_INFO.serial, TB_DONG_OAQ_INFO.user_id, ST_DISTANCE_SPHERE(TB_DONG_INFO.location, TB_DONG_OAQ_INFO.location) AS distance  FROM TB_DONG_INFO, TB_DONG_OAQ_INFO
WHERE TB_DONG_INFO.dcode LIKE '11%' AND TB_DONG_OAQ_INFO.use_yn='Y'
HAVING distance < 4000
ORDER BY TB_DONG_INFO.dcode, distance ) AS A, (SELECT @rowdcode:=0, @rownum:=0) AS R
) AS B
WHERE RNUM <= 3 )
						"""

	sql_seoul_air_ins = """
INSERT INTO TB_DONG_MAP_INFO  (
SELECT dcode,air_code,'A',ROUND(distance),CURRENT_TIMESTAMP FROM (
SELECT *, CASE @rowdcode COLLATE utf8mb4_unicode_ci WHEN dcode THEN @rownum:=@rownum+1 ELSE @rownum:=1 END AS RNUM, @rowdcode:=dcode AS rowdcode FROM (
SELECT TB_DONG_INFO.dcode, TB_DONG_AIRKOR_INFO.air_code, ST_DISTANCE_SPHERE(TB_DONG_INFO.location, TB_DONG_AIRKOR_INFO.location) AS distance  FROM TB_DONG_INFO, TB_DONG_AIRKOR_INFO
WHERE TB_DONG_INFO.dcode LIKE '11%' AND TB_DONG_AIRKOR_INFO.use_yn='Y'
HAVING distance < 10000
ORDER BY TB_DONG_INFO.dcode, distance ) AS A, (SELECT @rowdcode:=0, @rownum:=0) AS R
) AS B
WHERE RNUM <= 3)
						"""

	sql_other_del = "DELETE FROM TB_DONG_MAP_INFO WHERE dcode NOT LIKE '11%'"

	sql_other_air_ins = """
INSERT INTO TB_DONG_MAP_INFO  (
SELECT dcode,air_code,'A',ROUND(distance),CURRENT_TIMESTAMP FROM (
SELECT *, CASE @rowdcode COLLATE utf8mb4_unicode_ci WHEN dcode THEN @rownum:=@rownum+1 ELSE @rownum:=1 END AS RNUM, @rowdcode:=dcode AS rowdcode FROM (
SELECT TB_DONG_INFO.dcode, TB_DONG_AIRKOR_INFO.air_code, ST_DISTANCE_SPHERE(TB_DONG_INFO.location, TB_DONG_AIRKOR_INFO.location) AS distance  FROM TB_DONG_INFO, TB_DONG_AIRKOR_INFO
WHERE TB_DONG_INFO.dcode NOT LIKE '11%' AND TB_DONG_AIRKOR_INFO.use_yn='Y'
HAVING distance < 100000
ORDER BY TB_DONG_INFO.dcode, distance ) AS A, (SELECT @rowdcode:=0, @rownum:=0) AS R
) AS B
WHERE RNUM <= 3)
						"""

	try:
		# MySQL
		mysql_connection = pymysql.connect(host='kiot5', user='kiot',
			password='zpdliot1!', db='re_kiot', charset='utf8mb4',
			cursorclass=pymysql.cursors.DictCursor)

		with mysql_connection.cursor() as cursor:

			cursor.execute(sql_seoul_del)
			#cursor.execute(sql_seoul_oaq_ins)
			cursor.execute(sql_seoul_air_ins)
			print("job: make seoul dong map info success")

			cursor.execute(sql_other_del)
			cursor.execute(sql_other_air_ins)
			print("job: make other dong map info success")

		mysql_connection.commit()
		print("job: make dong map info success")

	except Exception:
		traceback.print_exc()

	finally:
		mysql_connection.close()


# Main
if __name__ == '__main__':
	print("Started make-dong-map-info.")

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
