<?php

/* edited by hansu.chung */

error_reporting(E_ALL & ~E_NOTICE);
ini_set("memory_limit", "512M");

$auth_ip = array(
	"211.219.114.115",
	"210.105.192.68",
	"220.95.232.76",
	);

$pday = array();

$kiot_api = array(
	"IAQ" => "http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%&end=%end%&m=sum:kw-iaq-sensor-kiot{serial=*,sensor=%sensor%}",
	"OAQ" => "http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%&end=%end%&m=sum:kw-oaq-sensor-kiot{serial=*,sensor=%sensor%}",
	"DOT" => "http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%&end=%end%&m=sum:kw-oaq-sensor-dot{serial=*,sensor=%sensor%}",
	"DONG" => "http://kiototsdb.kweather.co.kr:24242/api/query?start=%start%&end=%end%&m=sum:kma-aq{dcode=*,sensor=%sensor%}",

	);

$kiot_api_sensor = array(
	"IAQ" => "tm|pm10|pm25|co2|voc|noise|temp|humi",
	"OAQ" => "tm|pm10|pm25|co2|voc|noise|temp|humi",
	"DOT" => "tm|pm10|pm25|co2|voc|noise|temp|humi",
	"DONG" => "pm10|pm10_grade|pm25|pm25_grade",
	);

?>
