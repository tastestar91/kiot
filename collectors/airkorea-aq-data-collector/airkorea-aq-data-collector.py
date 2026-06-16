#!/usr/bin/env python3

#-------------------------------------------------------------------
# AIRKOREA Air Quality Data Collector [Python3/TAB]
#
# yskwon, 2020-05-26
#-------------------------------------------------------------------

import json
import signal
import sys
import time
import time as timelibrary

import traceback
from datetime import datetime, timedelta

import requests
import schedule
from rediscluster import RedisCluster
from bs4 import BeautifulSoup

import urllib3
import socket
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Global constants
CONFIG_FILE = "/opt/apps/apps-config.json"
HTTP_TIMEOUT = (10, 58)     # (connection_timeout, read_timeout)

PSEUDO_SERVICE_ID = "airkorea-aq"
REDIS_CHANNEL_NAME = "airkorea/weather/aq"

AIRK_AQ_METRIC_PREFIX = "airkorea-aq"
AIRK_AQ_SENSOR_FIELDS = [
	{ "field": 1, "sensor_name": "so2" },
	{ "field": 2, "sensor_name": "co" },
	{ "field": 3, "sensor_name": "o3" },
	{ "field": 4, "sensor_name": "no2" },
	{ "field": 5, "sensor_name": "pm10" },
	{ "field": 6, "sensor_name": "khai" },
	{ "field": 7, "sensor_name": "khai_grade" },
	{ "field": 8, "sensor_name": "so2_grade" },
	{ "field": 9, "sensor_name": "co_grade" },
	{ "field": 10, "sensor_name": "o3_grade" },
	{ "field": 11, "sensor_name": "no2_grade" },
	{ "field": 12, "sensor_name": "pm10_grade" },
	{ "field": 13, "sensor_name": "pm25" },
	{ "field": 14, "sensor_name": "pm25_grade" }
]


# Load configurations and start a redis cluster client
try:
	with open(CONFIG_FILE, 'r') as f:
		conf = json.load(f)

	# Redis
	# kiot1:36379,kiot3:36379,kiot4:36379,kiot5:36379,kiot6:36379
	redis_startup_nodes = []
	for address in conf["servers"]["kwKiotCluster"]["redis"]["address"][0].split(","):
		address = address.split(":")
		redis_startup_nodes.append({"host": address[0], "port": address[1]})

	rc = RedisCluster(startup_nodes=redis_startup_nodes, decode_responses=True,
		password=conf["servers"]["kwKiotCluster"]["redis"]["password"])

	# ingress-router/v1/sensors.get: + airkorea/weather/aq
	redis_ir_channel = conf["collector"]["redis"]["dataChannelV1"]["get"] + REDIS_CHANNEL_NAME

	# OpenTSDB WO
	s = requests.Session()
	# In a multithreaded environment, pool_maxsize must be increased
	s.mount("http://", requests.adapters.HTTPAdapter(pool_connections=1, pool_maxsize=1))

	# 10.100.100.101:24243
	tsdb_query_url = conf["servers"]["kwKiotCluster"]["opentsdbWo"]["address"][0].split(':')

	# Default last_updated_datetime (every 10 minutes)
	timestamp = (int(time.time()/60))*60
	last_updated_datetime = datetime.fromtimestamp(timestamp).strftime("%Y%m%d%H%M")
	print(f"INFO: Set default lastUpdatedDatetime: {last_updated_datetime}-{timestamp}")

except Exception:
	traceback.print_exc()
	sys.exit(1)

station = {'시흥대로': 26142, '효성': 26141, '복운리': 26140, '효자동': 26139, '여의동': 26138, '광활면': 26137, '봉강면': 26136, '진량읍': 26135, '송정동': 26134, '합덕읍': 26133, '전곡': 26132, '호매실': 26131, '안양8동': 26130, '배곧동': 26129, '서해안로': 26128, '진접읍': 26127, '와부읍': 26126, '곤지암': 26125, '고덕면': 26124, '가남읍': 26123, '설악면': 26122, '새솔동': 26121, '연천(DMZ)': 26120, '송산3동': 26119, '서신면': 26118, '봉담읍': 26117, '미사': 26116, '죽산면': 26115, '장현동': 26114, '양평읍': 26113, '한강로': 26112, '경춘로': 26111, '청북읍': 26110, '월곶면': 26109, '용문면': 26108, '오포읍': 26107, '공도읍': 26106, '한강신도시': 26105, '파주읍': 26104, '중앙동': 26103, '부발읍': 26102, '목감동': 26101, '대신면': 26100, '금암로(신장동)': 26099, '이동읍': 26097, '백암면': 26096, '모현읍': 26095, '장호원읍': 26094, '송북동': 26093, '청계동': 26092, '주엽동': 26091, '우정읍': 26090, '연천': 26089, '화도읍': 26088, '별내동': 26087, '고읍': 26086, '일동면': 26085, '송내대로(중동)': 26084, '파주': 26083, '신원동': 26082, '운정': 26081, '오정동': 26079, '중2동': 26078, '내동': 26077, '소사본동': 26076, '가평': 26074, '봉산동': 26071, '보산동': 26070, '백석읍': 26069, '동탄': 26068, '향남읍': 26067, '남양읍': 26066, '신장동': 26065, '오산동': 26064, '산본동': 26063, '당동': 26062, '고촌읍': 26060, '사우동': 26059, '선단동': 26058, '관인면': 26057, '창전동': 26056, '설성면': 26055, '중부대로(구갈동)': 26054, '기흥': 26053, '수지': 26052, '김량장동': 26051, '경안동': 26050, '백마로(마두역)': 26049, '식사동': 26048, '행신동': 26047, '금촌동': 26046, '평택항': 26045, '안중': 26044, '비전동': 26043, '오남읍': 26042, '금곡동': 26041, '대야동': 26040, '시화산단': 26039, '정왕동': 26038, '고천동': 26037, '부곡3동': 26036, '동구동': 26035, '교문동': 26034, '과천동': 26033, '별양동': 26032, '중앙대로(고잔동)': 26031, '호수동': 26030, '대부동': 26029, '부곡동1': 26028, '원곡동': 26027, '본오동': 26026, '원시동': 26025, '고잔동': 26024, '소하동': 26023, '철산동': 26022, '안양2동': 26021, '호계동': 26020, '부림동': 26019, '의정부1동': 26017, '의정부동': 26016, '상대원동': 26015, '운중동': 26014, '복정동': 26013, '성남대로(모란역)': 26012, '수내동': 26011, '정자동': 26010, '단대동': 26009, '대왕판교로(백현동)': 26008, '고색동': 26007, '경수대로(동수원)': 26006, '천천동': 26005, '영통동': 26004, '광교동': 26003, '인계동': 26002, '신풍동': 26001, '금성면': 25045, '김해대로': 25044, '향촌동': 25043, '정촌면': 25042, '물금읍': 25041, '내서읍': 25040, '고현동': 25039, '삼호동': 25038, '합천읍': 25037, '창녕읍': 25036, '진영읍': 25035, '의령읍': 25034, '월영동': 25033, '산청읍': 25032, '성주동': 25031, '함양읍': 25030, '남해읍': 25029, '고성읍': 25028, '거창읍': 25027, '가야읍': 25026, '무전동': 25025, '내일동': 25024, '남상면': 25023, '북부동': 25021, '대산면': 25020, '사천읍': 25019, '아주동': 25018, '저구리': 25017, '장유동': 25016, '삼방동': 25015, '동상동': 25014, '하동읍': 25013, '경화동': 25012, '사파동': 25011, '반송로': 25010, '용지동': 25009, '웅남동': 25007, '명서동': 25006, '상대동': 25005, '대안동': 25004, '상봉동': 25003, '봉암동': 25002, '회원동': 25001, '영주동': 24057, '안계면': 24056, '하양읍': 24055, '제철동': 24054, '연일읍': 24053, '봉화군청': 24052, '우현동': 24051, '평화남산동': 24050, '진미동': 24049, '영해면': 24048, '강구면': 24047, '화양읍': 24046, '청송읍': 24045, '의성읍': 24044, '율곡동': 24043, '예천군': 24042, '영양군': 24041, '성주군': 24040, '문경시': 24039, '군위읍': 24038, '가흥동': 24037, '영덕읍': 24036, '대가야읍': 24035, '청림동': 24034, '울릉군': 24033, '오천읍': 24032, '송도동': 24031, '명륜동': 24030, '외동읍': 24029, '안강읍': 24028, '석포면': 24027, '보덕동': 24026, '대광동': 24025, '울진군': 24024, '영천시': 24022, '칠곡군': 24021, '상주시': 24020, '태하리': 24018, '안계면(교외)': 24017, '화북면': 24016, '중방동': 24014, '4공단': 24012, '형곡동': 24011, '원평동': 24010, '공단동': 24009, '성건동': 24006, '3공단': 24005, '대송면': 24004, '대도동': 24003, '장량동': 24002, '장흥동': 24001, '중동(유해+중금속)': 23046, '대불': 23045, '홍도': 23044, '보성읍': 23043, '안마도': 23042, '가거도': 23041, '영암읍': 23040, '벌교읍': 23039, '곡성군': 23038, '화순읍': 23037, '신안군': 23036, '무안읍': 23035, '구례읍': 23034, '고흥읍': 23033, '강진읍': 22026, '함평읍': 23031, '진도읍': 23030, '신지면': 23029, '장흥읍': 23028, '신대': 23027, '영광읍': 23026, '화양면': 23025, '율촌면': 23024, '삼일동': 23023, '해남읍': 23022, '장성읍': 23021, '서강동': 23020, '빛가람동': 23019, '담양읍': 23018, '송단리': 23017, '광양읍': 23015, '태인동': 23013, '호두리': 23011, '순천만': 23010, '연향동': 23009, '장천동': 23008, '덕충동': 23007, '여천동(여수)': 23006, '문수동': 23005, '월내동': 23004, '부흥동': 23002, '용당동': 23001, '금마면': 22046, '운봉읍': 22045, '사정동': 22044, '춘포면': 22043, '여산면': 22042, '소룡동2': 22041, '말도': 22040, '영파동': 22039, '구이면': 22038, '관촌면': 22037, '계화면': 22036, '서신동': 22035, '혁신동': 22034, '함열읍': 22033, '봉동읍': 22032, '노송동': 22031, '옥산면': 22030, '비응도동': 22029, '용동면': 22028, '삼기면': 22027, '심원면': 22025, '순창읍': 22024, '임실읍': 22023, '신태인': 22022, '송천동': 22021, '무주읍': 22020, '진안읍': 22019, '고산면': 22018, '새만금': 22017, '요촌동': 22016, '부안읍': 22015, '운암면': 22014, '고창읍': 22013, '죽항동': 22012, '연지동': 22011, '모현동': 22010, '팔봉동': 22009, '소룡동': 22006, '신풍동(군산)': 22005, '팔복동': 22003, '삼천동': 22002, '송악면': 21046, '원북면': 21045, '삽교읍': 21044, '장재리': 21043, '성동면': 21042, '외연도': 21041, '격렬비열도': 21040, '정산면': 21039, '연무읍': 21038, '탄천면': 21037, '신방동': 21036, '성연면': 21035, '장항읍': 21034, '내포': 21033, '주교면': 21032, '대산리': 21031, '인주면': 21030, '엄사면': 21029, '서천읍': 21028, '서면': 21027, '둔포면': 21026, '도고면': 21025, '청양읍': 21024, '성거읍': 21023, '배방읍': 21022, '당진시청사': 21021, '금산읍': 21020, '송산면': 21019, '부여읍': 21018, '홍성읍': 21017, '태안읍': 21016, '이원면': 21015, '예산군': 21014, '대천2동': 21013, '논산': 21012, '공주': 21011, '파도리': 21010, '모종동': 21009, '동문동': 21006, '독곶리': 21005, '사곡면': 21004, '성성동': 21003, '백석동': 21002, '성황동': 21001, '황간면': 20034, '도안면': 20033, '청풍면': 20032, '영천동': 20031, '소이면': 20030, '감물면': 20029, '가덕면': 20028, '중앙탑면': 20027, '살미면': 20026, '덕산읍': 20025, '단양읍': 20024, '단성면': 20023, '용담동': 20022, '음성읍': 20021, '오송읍': 20020, '산남동': 20019, '괴산읍': 20018, '보은읍': 20017, '증평읍': 20016, '영동읍': 20015, '금왕': 20014, '옥천읍': 20013, '진천읍': 20012, '청천면': 20011, '매포읍': 20010, '오창읍': 20009, '장락동': 20008, '칠금동': 20007, '호암동': 20006, '복대동': 20005, '용암동': 20004, '사천동': 20002, '송정동(봉명동)': 20001, '주문진읍': 19036, '지정면': 19035, '화천(DMZ)': 19034, '철원(DMZ)': 19033, '인제(DMZ)': 19032, '고성(DMZ)': 19031, '반곡동(명륜동)': 19030, '신사우동': 19029, '온의동': 19028, '갈말읍': 19027, '인제군': 19025, '화천군': 19024, '홍천읍': 19023, '태백시': 19022, '양구읍': 19021, '속초시(금호동)': 19020, '횡성군': 19019, '정선읍': 19017, '영월읍': 19016, '양양군': 19015, '상리': 19014, '문막읍': 19013, '평창읍': 19012, '치악산': 19011, '간성읍': 19010, '북평면': 19009, '남양동1': 19008, '천곡동': 19007, '옥천동': 19006, '중앙동(원주)': 19004, '방산면': 19003, '석사동': 19002, '중앙로': 19001, '일곡동': 18014, '유촌동': 18013, '우산동(광주)': 18012, '평동': 18011, '노대동': 18010, '주월동': 18009, '오선동': 18008, '건국동': 18006, '운암동': 18005, '두암동': 18004, '치평동': 18003, '농성동': 18002, '서석동': 18001, '화북동': 17012, '강정동': 17011, '한림읍': 17010, '조천읍': 17009, '노형로': 17008, '남원읍': 17007, '대정읍': 17006, '성산읍': 17005, '고산리': 17004, '동홍동': 17003, '연동': 17002, '이도동': 17001, '북부순환도로': 16021, '삼남읍': 16020, '범서읍': 16019, '웅촌면': 16018, '전하동': 16017, '약사동': 16016, '농소동': 16014, '상남리': 16013, '화산리': 16012, '효문동': 16011, '무거동': 16010, '덕신리': 16009, '신정동': 16008, '도로변': 16007, '삼산동': 16006, '야음동': 16005, '여천동(울산)': 16004, '부곡동(울산)': 16003, '성남동': 16002, '대송동': 16001, '용호동': 15033, '삼락동': 15032, '회동동': 15031, '명지동': 15030, '화명동': 15029, '청학동': 15028, '재송동': 15027, '당리동': 15026, '개금동': 15025, '부산신항': 15024, '부산북항': 15023, '덕포동': 15022, '대신동': 15021, '광안동': 15020, '부곡동': 15019, '수정동': 15018, '용수리': 15017, '기장읍': 15016, '연산동': 15015, '녹산동': 15014, '대저동': 15013, '장림동': 15012, '좌동': 15011, '청룡동': 15010, '덕천동': 15009, '학장동': 15008, '대연동': 15007, '명장동': 15006, '온천동': 15005, '전포동': 15004, '태종대': 15003, '초량동': 15002, '광복동': 15001, '보람동': 14005, '부강면': 14004, '한솔동': 14003, '아름동': 14002, '신흥동': 14001, '남산1동': 13024, '화원읍': 13023, '침산동': 13022, '산격동': 13021, '내당동': 13020, '본동': 13019, '유가읍': 13018, '다사읍': 13017, '진천동': 13016, '시지동': 13015, '이곡동': 13014, '호림동': 13012, '만촌동': 13011, '태전동': 13010, '신암동': 13009, '대명동': 13007, '평리동': 13006, '이현동': 13005, '서호동': 13004, '지산동': 13003, '수창동': 13002, '관평동': 12013, '상대동(대전)': 12012, '대성동': 12011, '월평동': 12010, '둔산동': 12009, '정림동': 12008, '성남동1': 12007, '대흥동1': 12006, '노은동': 12005, '구성동': 12004, '문창동': 12003, '문평동': 12002, '읍내동': 12001, '중봉': 11035, '주안': 11034, '영종': 11033, '아암': 11032, '서창': 11031, '울도': 11030, '연평도': 11029, '서해': 11028, '남동': 11027, '영흥': 11026, '삼산': 11025, '길상': 11024, '청라': 11023, '송도': 11022, '백령도': 11021, '덕적도': 11020, '석모리': 11019, '원당': 11018, '논현': 11017, '송현': 11016, '운서': 11015, '동춘': 11014, '송해': 11013, '석남': 11012, '고잔': 11011, '계산': 11010, '검단': 11009, '연희': 11008, '부평': 11007, '부평역': 11006, '석바위': 11005, '숭의': 11004, '구월동': 11003, '송림': 11002, '신흥': 11001, '화랑로': 10040, '노원구': 10039, '양천구': 10038, '강북구': 10037, '금천구': 10036, '천호대로': 10035, '강동구': 10034, '송파구': 10033, '강남대로': 10032, '도산대로': 10031, '서초구': 10030, '강남구': 10029, '관악구': 10028, '동작대로 중앙차로': 10027, '동작구': 10026, '영등포로': 10025, '영등포구': 10024, '구로구': 10023, '공항대로': 10022, '강서구': 10021, '신촌로': 10020, '마포구': 10019, '서대문구': 10018, '은평구': 10017, '도봉구': 10016, '정릉로': 10015, '성북구': 10014, '홍릉로': 10012, '동대문구': 10011, '중랑구': 10010, '강변북로': 10009, '성동구': 10008, '광진구': 10007, '용산구': 10006, '종로': 10005, '청계천로': 10004, '종로구': 10003, '한강대로': 10002, '중구': 10001}
korea = ['서울','인천','대전','대구','세종','부산','울산','제주','광주','강원','충북','충남','전북','전남','경북','경남','경기']

def receive_signal(signal_number, frame):
	print("Received signal: " + str(signal_number))
	sys.exit()


def release():
	print("Disconnected from all servers and released all resources")
	s.close()


def sendTelegram(message):
	token = conf["telegram"]["token"]
	chat_id = conf["telegram"]["chat_id"]
	r = s.post(f'https://api.telegram.org/bot{token}/sendmessage?chat_id={chat_id}&text={message}')
	r.raise_for_status()



def send_to_tsdb(rows):

	for row in rows:
		metric = f"{AIRK_AQ_METRIC_PREFIX}.{row[0]}"

		for sensor in AIRK_AQ_SENSOR_FIELDS:
			if row[sensor["field"]] != '-':
				if row[sensor["field"]].isdigit() :
					svalue = int(row[sensor["field"]]) 
				else : 
					svalue = float(row[sensor["field"]]) 

				so.send(f"put {metric} {row[15]} {svalue} sensor={sensor['sensor_name']}\n".encode('utf-8'))
				so.send(f"put {AIRK_AQ_METRIC_PREFIX} {row[15]} {svalue} sensor={sensor['sensor_name']} air_id={row[0]}\n".encode('utf-8'))
	

def publish_to_redis(rows):

	ir_data = {
		"service": {
			"id": PSEUDO_SERVICE_ID,
		}
	}
	
	for row in rows:
		ir_data["service"]["deviceId"] = row[0]
		ir_data["service"]["timestamp"] = row[15]
		ir_data["data"] = {}
		for sensor in AIRK_AQ_SENSOR_FIELDS:
			if row[sensor["field"]] != '-':
				if row[sensor["field"]].isdigit() :
					svalue = int(row[sensor["field"]]) 
				else : 
					svalue = float(row[sensor["field"]]) 
				ir_data["data"][sensor["sensor_name"]] = svalue
		
		#print(ir_data)
		rc.publish(redis_ir_channel, json.dumps(ir_data))

def not_over_23(str):
	list_str = list(str)
	list_str[11] = '0'
	list_str[12] = '0'
	time = "".join(list_str)

	timestamp = datetime.strptime(time, "%Y-%m-%d %H:%M") + timedelta(days=1)
	timestamp = int(timelibrary.mktime(timestamp.timetuple()))
	return timestamp

def dataRequest(state) :
	try :
		headers= {'content-type': 'application/json'}
		r = s.get(f'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?sidoName={state}&pageNo=1&numOfRows=200&returnType=xml&serviceKey=GX49dEBx5%2FNF440Mrr0jYRsLZihNiRMVskTvY23idMyvmPEeLLDXnnkkils%2BxE9MypD12Ebf2RRiP%2F0r2ukwNA%3D%3D&ver=1.0'
							, headers=headers, verify=False, timeout=10)
		r.raise_for_status()
		return r
	except Exception as e:
		sendTelegram(f'kiot:airkorea {e}')
	
# Job to be scheduled
def job():
	global timestamp
	global last_updated_datetime

	timestamp = (int(time.time()/60))*60
	last_updated_datetime = datetime.fromtimestamp(timestamp).strftime("%Y%m%d%H%M")
	print(f"INFO: lastUpdatedDatetime: {last_updated_datetime}-{timestamp}")

	try : 
		rows = []
		for state in korea:
			xmlData = dataRequest(state)
			airkorea_data = BeautifulSoup(xmlData.text, 'html.parser')
			
			for el in airkorea_data.select('item'):
				if station.get(el.stationname.string) is None:
					print(el.stationname.string)
					continue

				row = [
					station[el.stationname.string],
					el.so2value.string or '-',
					el.covalue.string or '-', 
					el.o3value.string or '-', 
					el.no2value.string or '-', 
					el.pm10value.string or '-',  
					el.khaivalue.string or '-',
					el.khaigrade.string or '-', 
					el.so2grade.string or '-',
					el.cograde.string or '-',
					el.o3grade.string or '-',
					el.no2grade.string or '-',
					el.pm10grade.string or '-',
					el.pm25value.string or '-',
					el.pm25grade.string or '-',
					el.datatime.string or '-'
					]

				if row[15] != '-' and row[15][11:13] != '24':
					row[15] = int(timelibrary.mktime(datetime.strptime(row[15], "%Y-%m-%d %H:%M").timetuple()))
					rows.append(row)

				elif row[15][11:13] == '24' :
					row[15] = not_over_23(row[15])
					rows.append(row)
		
		global so
		with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as so:
			so.connect((tsdb_query_url[0], int(tsdb_query_url[1])))
			send_to_tsdb(rows)
			publish_to_redis(rows)
			so.close()
	
			
		print(f"SUCCESS: [OpenTSDB/PUT][Redis/PUB]: Updated new  rows. Last updated = {last_updated_datetime}-{timestamp}")

	except Exception as e:
		sendTelegram('kiot:airkorea'+ e)
		traceback.print_exc()

# Main
if __name__ == '__main__':
	print("Started AIRKOREA Air Quality Data Collector.")

	signal.signal(signal.SIGHUP, receive_signal)
	signal.signal(signal.SIGTERM, receive_signal)
	signal.signal(signal.SIGQUIT, receive_signal)

	try:
		job()
		# Schedule a job every 10 minutes
		schedule.every().hour.at(":15").do(job)
		schedule.every().hour.at(":30").do(job)
		schedule.every().hour.at(":55").do(job)
		
		while True:
			schedule.run_pending()
			time.sleep(1)
	except (KeyboardInterrupt, SystemExit):
		print("Stopping AIRKOREA Air Quality Data Collector.")
	except Exception:
		traceback.print_exc()
	finally:
		release()
		print("Stopped AIRKOREA Air Quality Data Collector.")
