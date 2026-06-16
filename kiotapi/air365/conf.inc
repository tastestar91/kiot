<?php
error_reporting(E_ALL & ~E_NOTICE);
// ini_set('memory_limit', '512M');

$auth_ip = array(
	'127.0.0.1',		// ai365 local server
	'220.95.232.212',	// ai365 dev server
	'220.95.238.39',	// ai365 real server
	'220.95.238.45',	// ai365 real server
	'59.29.245.72',	// 크리콜투 - 개발PC
	'15.164.58.115',	// 크리콜투 - 개발서버
	'54.180.179.109',	// 크리콜투 - 개발서버
	'218.145.201.38',	// 잔여개발 업체 개발자 PC
	'121.165.242.200',	// 잔여개발 업체 개발자 PC
	'220.95.238.50',	// AIR365 단독서버(내부)
);

$kiot_api_ir = array(
	'IAQ' => 'http://kiotdpd.kweather.co.kr:30101/v1/groups/kw-isk/%serial%',
	'OAQ' => 'http://kiotdpd.kweather.co.kr:30101/v1/groups/kw-osk/%serial%',
	'VENT' => 'http://kiotdpd.kweather.co.kr:30101/v1/groups/kw-vsk/%serial%',
	'USER' => 'http://kiotdpd.kweather.co.kr:30101/v1/groups/u-%id%',
	'GROUP' => 'http://kiotdpd.kweather.co.kr:30101/v1/groups/g-%id%',
	'GROUP_ALL' => 'http://kiotdpd.kweather.co.kr:30101/v1/groups',

	'IAQ-BEEMS' => 'http://kiotdpd.kweather.co.kr:30101/v1/sensors/kw-isbe1/%serial%',
	'VENT-BEEMS' => 'http://kiotdpd.kweather.co.kr:30101/v1/sensors/kw-vsbp1/%serial%',
	'CLEANER-BEEMS' => 'http://kiotdpd.kweather.co.kr:30101/v1/sensors/kw-csbp1/%serial%',
	'AIRCON-BEEMS' => 'http://kiotdpd.kweather.co.kr:30101/v1/sensors/kw-asbp1/%serial%',
);

$kiot_api_st = array(
	'IAQ' => array( 'all' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=sum:kw-iaq-sensor-kiot.%serial%{sensor=*}',
			'hour' => array( 'avg' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=avg:1h-avg-none:kw-iaq-sensor-kiot.%serial%{sensor=*}',
					 'min' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=min:1h-min-none:kw-iaq-sensor-kiot.%serial%{sensor=*}',
					 'max' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=max:1h-max-none:kw-iaq-sensor-kiot.%serial%{sensor=*}'
				 ),
			 'day' => array( 'url' => 'http://kiototsdb.kweather.co.kr:24242/api/query',
			 		 'avg' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-iaq-sensor-kiot.%serial%","tags":{"sensor":"*"},"downsample":"1d-avg-none"}]}',
			 		 'min' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-iaq-sensor-kiot.%serial%","tags":{"sensor":"*"},"downsample":"1d-min-none"}]}',
			 		 'max' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-iaq-sensor-kiot.%serial%","tags":{"sensor":"*"},"downsample":"1d-max-none"}]}'
			 )
		),
	'OAQ' => array( 'all' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=sum:kw-oaq-sensor-kiot.%serial%{sensor=*}',
			'hour' => array( 'avg' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=avg:1h-avg-none:kw-oaq-sensor-kiot.%serial%{sensor=*}',
					 'min' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=min:1h-min-none:kw-oaq-sensor-kiot.%serial%{sensor=*}',
					 'max' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=max:1h-max-none:kw-oaq-sensor-kiot.%serial%{sensor=*}'
				 ),
			 'day' => array( 'url' => 'http://kiototsdb.kweather.co.kr:24242/api/query',
			 		 'avg' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-oaq-sensor-kiot.%serial%","tags":{"sensor":"*"},"downsample":"1d-avg-none"}]}',
			 		 'min' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-oaq-sensor-kiot.%serial%","tags":{"sensor":"*"},"downsample":"1d-min-none"}]}',
			 		 'max' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-oaq-sensor-kiot.%serial%","tags":{"sensor":"*"},"downsample":"1d-max-none"}]}'
				 ),
			'visitor' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=sum:kw-oaq-sensor-kiot.%serial%{sensor=tm|visitor}',
			'pmraw' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=sum:kw-oaq-sensor-kiot.%serial%{sensor=tm|pm10|pm10_raw|pm25|pm25_raw}'
		),
	'VENT' => array( 'all' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=sum:kw-vent-sensor-kiot.%serial%{sensor=*}',
			'hour' => array( 'avg' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=avg:1h-avg-none:kw-vent-sensor-kiot.%serial%{sensor=*}',
					 'min' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=min:1h-min-none:kw-vent-sensor-kiot.%serial%{sensor=*}',
					 'max' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=max:1h-max-none:kw-vent-sensor-kiot.%serial%{sensor=*}'
				 ),
			 'day' => array( 'url' => 'http://kiototsdb.kweather.co.kr:24242/api/query',
			 		 'avg' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-vent-sensor-kiot.%serial%","tags":{"sensor":"*"},"downsample":"1d-avg-none"}]}',
			 		 'min' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-vent-sensor-kiot.%serial%","tags":{"sensor":"*"},"downsample":"1d-min-none"}]}',
			 		 'max' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-vent-sensor-kiot.%serial%","tags":{"sensor":"*"},"downsample":"1d-max-none"}]}'
			 )
		),


	'IAQ-BEEMS' => array( 'all' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=sum:kw-iaq-sensor-beems.%serial%{sensor=*}',
			'hour' => array( 'avg' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=avg:1h-avg-none:kw-iaq-sensor-beems.%serial%{sensor=*}',
					 'min' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=min:1h-min-none:kw-iaq-sensor-beems.%serial%{sensor=*}',
					 'max' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=max:1h-max-none:kw-iaq-sensor-beems.%serial%{sensor=*}'
				 ),
			 'day' => array( 'url' => 'http://kiototsdb.kweather.co.kr:24242/api/query',
			 		 'avg' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-iaq-sensor-beems.%serial%","tags":{"sensor":"*"},"downsample":"1d-avg-none"}]}',
			 		 'min' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-iaq-sensor-beems.%serial%","tags":{"sensor":"*"},"downsample":"1d-min-none"}]}',
			 		 'max' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-iaq-sensor-beems.%serial%","tags":{"sensor":"*"},"downsample":"1d-max-none"}]}'
			 )
		),

	'VENT-BEEMS' => array( 'all' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=sum:kw-vent-sensor-beems.%serial%{sensor=*}',
			'hour' => array( 'avg' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=avg:1h-avg-none:kw-vent-sensor-beems.%serial%{sensor=*}',
					 'min' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=min:1h-min-none:kw-vent-sensor-beems.%serial%{sensor=*}',
					 'max' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=max:1h-max-none:kw-vent-sensor-beems.%serial%{sensor=*}'
				 ),
			 'day' => array( 'url' => 'http://kiototsdb.kweather.co.kr:24242/api/query',
			 		 'avg' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-vent-sensor-beems.%serial%","tags":{"sensor":"*"},"downsample":"1d-avg-none"}]}',
			 		 'min' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-vent-sensor-beems.%serial%","tags":{"sensor":"*"},"downsample":"1d-min-none"}]}',
			 		 'max' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-vent-sensor-beems.%serial%","tags":{"sensor":"*"},"downsample":"1d-max-none"}]}'
			 )
		),

	'CLEANER-BEEMS' => array( 'all' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=sum:kw-cleaner-sensor-beems.%serial%{sensor=*}',
			'hour' => array( 'avg' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=avg:1h-avg-none:kw-cleaner-sensor-beems.%serial%{sensor=*}',
					 'min' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=min:1h-min-none:kw-cleaner-sensor-beems.%serial%{sensor=*}',
					 'max' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=max:1h-max-none:kw-cleaner-sensor-beems.%serial%{sensor=*}'
				 ),
			 'day' => array( 'url' => 'http://kiototsdb.kweather.co.kr:24242/api/query',
			 		 'avg' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-cleaner-sensor-beems.%serial%","tags":{"sensor":"*"},"downsample":"1d-avg-none"}]}',
			 		 'min' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-cleaner-sensor-beems.%serial%","tags":{"sensor":"*"},"downsample":"1d-min-none"}]}',
			 		 'max' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-cleaner-sensor-beems.%serial%","tags":{"sensor":"*"},"downsample":"1d-max-none"}]}'
			 )
		),

	'BEEMS-AIRCON' => array( 'all' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=sum:kw-aircon-sensor-beems.%serial%{sensor=*}',
			'hour' => array( 'avg' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=avg:1h-avg-none:kw-aircon-sensor-beems.%serial%{sensor=*}',
					 'min' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=min:1h-min-none:kw-aircon-sensor-beems.%serial%{sensor=*}',
					 'max' => 'http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%-00:00:00&end=%end%-23:59:59&m=max:1h-max-none:kw-aircon-sensor-beems.%serial%{sensor=*}'
				 ),
			 'day' => array( 'url' => 'http://kiototsdb.kweather.co.kr:24242/api/query',
			 		 'avg' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-aircon-sensor-beems.%serial%","tags":{"sensor":"*"},"downsample":"1d-avg-none"}]}',
			 		 'min' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-aircon-sensor-beems.%serial%","tags":{"sensor":"*"},"downsample":"1d-min-none"}]}',
			 		 'max' => '{"start":"%start%-00:00:00","end":"%end%-23:59:59","timezone":"Asia/Seoul","useCalendar":true,"queries":[{"aggregator":"sum","metric":"kw-aircon-sensor-beems.%serial%","tags":{"sensor":"*"},"downsample":"1d-max-none"}]}'
			 )
		),
);

$kiot_sensor_ir = array(
	'IAQ' => array( 'pm01', 'pm25', 'pm10', 'temp', 'humi', 'co2', 'voc', 'noise', 'windd', 'windd_max', 'winds', 'winds_max',
       			'lux', 'uv', 'accx', 'accx_max', 'accy', 'accy_max', 'accz', 'accz_max', 'wbgt',
			'co', 'hcho', 'o3', 'rn', 'no2', 'so2', 'visitor', 'atm', 'rain', 'nh3', 'h2s', 'gps_lat', 'gps_lon',
			'cici', 'rainfall', 'day_rainfall'
		),
	'OAQ' => array( 'pm01', 'pm25', 'pm10', 'temp', 'humi', 'co2', 'voc', 'noise', 'windd', 'windd_max', 'winds', 'winds_max',
       			'lux', 'uv', 'accx', 'accx_max', 'accy', 'accy_max', 'accz', 'accz_max', 'wbgt',
			'co', 'hcho', 'o3', 'rn', 'no2', 'so2', 'visitor', 'atm', 'rain', 'nh3', 'h2s', 'gps_lat', 'gps_lon',
			'coci', 'rainfall', 'day_rainfall'
		),
	'VENT' => array( 'power', 'air_volume', 'exh_mode', 'auto_mode', 'filter_alarm', 'air_mode', 'fire_alarm', 'water_alarm', 'dev_stat'
		),
	'ALL' => array( 'pm01', 'pm25', 'pm10', 'temp', 'humi', 'co2', 'voc', 'noise', 'windd', 'windd_max', 'winds', 'winds_max',
       			'lux', 'uv', 'accx', 'accx_max', 'accy', 'accy_max', 'accz', 'accz_max', 'wbgt',
			'co', 'hcho', 'o3', 'rn', 'no2', 'so2', 'visitor', 'atm', 'rain', 'nh3', 'h2s', 'gps_lat', 'gps_lon',
			'cici', 'coci', 'rainfall', 'day_rainfall'
		),
	'VISITOR' => array( 'visitor' ),
	'PMRAW' => array( 'pm25', 'pm10','pm25_raw', 'pm10_raw' ),

	'IAQ-BEEMS' => array( 'pm01_raw','pm25_raw','pm10_raw','temp','humi','co2','voc','noise','pm10','pm25','pm01','cici_pm10','cici_pm25','cici_co2','cici_voc','ciai','cici_temp','cici_humi','cici','cici_noise'),
	'VENT-BEEMS' => array('reg_date','power','air_volume','exh_mode','auto_mode','filter_alarm','air_mode'),
	'CLEANER-BEEMS' => array('reg_date','power','op_mode','temp','humi','set_air_volume','air_volume'),
	'BEEMS-AIRCON' => array('reg_date','power','op_mode','air_volume','filter_alarm','set_temp','temp'),
);
/*
 * @Yonghee 2022-03-24
 * $kiot_sensor_ir 대비, IAQ, OAQ, ALL 모두 'windd', 'windd_max', 'winds', 'winds_max', 'rainfall' 빠져 있었음 > 추가
 */
$kiot_sensor_st = array(
	'IAQ' => array( 'pm01', 'pm25', 'pm10', 'temp', 'humi', 'co2', 'voc', 'noise', 'windd', 'windd_max', 'winds', 'winds_max',
       			'lux', 'uv', 'accx', 'accx_max', 'accy', 'accy_max', 'accz', 'accz_max', 'wbgt',
			'co', 'hcho', 'o3', 'rn', 'no2', 'so2', 'visitor', 'atm', 'rain', 'nh3', 'h2s', 'rainfall', 'day_rainfall'
		),
	'OAQ' => array( 'pm01', 'pm25', 'pm10', 'temp', 'humi', 'co2', 'voc', 'noise', 'windd', 'windd_max', 'winds', 'winds_max',
       			'lux', 'uv', 'accx', 'accx_max', 'accy', 'accy_max', 'accz', 'accz_max', 'wbgt',
			'co', 'hcho', 'o3', 'rn', 'no2', 'so2', 'visitor', 'atm', 'rain', 'nh3', 'h2s', 'rainfall', 'day_rainfall'
		),
	'VENT' => array( 'power', 'air_volume', 'exh_mode', 'auto_mode', 'filter_alarm', 'air_mode', 'fire_alarm', 'water_alarm', 'dev_stat'
		),
	'ALL' => array( 'pm01', 'pm25', 'pm10', 'temp', 'humi', 'co2', 'voc', 'noise', 'windd', 'windd_max', 'winds', 'winds_max',
       			'lux', 'uv', 'accx', 'accx_max', 'accy', 'accy_max', 'accz', 'accz_max', 'wbgt',
			'co', 'hcho', 'o3', 'rn', 'no2', 'so2', 'visitor', 'atm', 'rain', 'nh3', 'h2s', 'rainfall', 'day_rainfall'
		),
	'IAQ-BEEMS' => array( 'pm01_raw','pm25_raw','pm10_raw','temp','humi','co2','voc','noise','pm10','pm25','pm01','cici_pm10','cici_pm25','cici_co2','cici_voc','ciai','cici_temp','cici_humi','cici','cici_noise'),
	'VENT-BEEMS' => array('reg_date','power','air_volume','exh_mode','auto_mode','filter_alarm','air_mode'),
	'CLEANER-BEEMS' => array('reg_date','power','op_mode','temp','humi','set_air_volume','air_volume'),
	'BEEMS-AIRCON' => array('reg_date','power','op_mode','air_volume','filter_alarm','set_temp','temp'),
);
