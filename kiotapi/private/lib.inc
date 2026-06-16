<?php

/**
 * lib.inc
 */

function check_auth() {
	global $auth_ip;
	if (!in_array($_SERVER['REMOTE_ADDR'], $auth_ip)) {
		header("HTTP/1.1 401 Unauthorized");
		exit;
	}
}

function check_param() {
	global $pday;

	$qday = $_GET['qday'];;
	$pday = date_parse_from_format("Ymd", $qday);
	if (empty($pday) || $pday['warning_count']>0 || $pday['error_count']>0) {
		header("HTTP/1.1 400 Bad Request");
		exit;
	}
}

function get_kiot_data($kiot_api, $kiot_sensor) {
	global $pday;

	$start = sprintf("%04d/%02d/%02d-00:00:00", $pday['year'], $pday['month'], $pday['day']);
	$end = sprintf("%04d/%02d/%02d-23:59:59", $pday['year'], $pday['month'], $pday['day']);

	$rep_str1 = array("%start%", "%end%", "%sensor%");
	$rep_str2 = array($start, $end, $kiot_sensor);
	$api = str_replace($rep_str1, $rep_str2, $kiot_api);

	$ch = curl_init($api);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	$api_data = curl_exec($ch);
	if(curl_errno($ch)) {
		curl_close($ch);
		header("HTTP/1.1 500 Internal Server Error");
		exit;
	}
	curl_close($ch);

	$data_arr = json_decode($api_data, true);
	unset($api_data);

	$data = array();
	foreach ($data_arr as $key => $tags) {
		$serial = $tags['tags']['serial'];
		$sensor = $tags['tags']['sensor'];
		foreach ($tags['dps'] as $dps => $value) {
			$data[$serial][$dps][$sensor] = $value;
		}

		//break;
	}
	unset($data_arr);

	return $data;
}

function return_kiot_data($data, $kiot_sensor) {
	header('Content-Type: text/plain');
	echo "serial," . str_replace('|', ',', $kiot_sensor) . "\n";

	foreach ($data as $serial => $dps) {
		foreach ($dps as $key => $value) {
			echo	$serial . "," .
				date("YmdHi", $key) . "," .
				$value['pm10'] . "," .
				$value['pm25'] . "," .
				$value['co2'] . "," .
				$value['voc'] . "," .
				$value['noise'] . "," .
				$value['temp'] . "," .
				$value['humi'] .  "\n";
		}
	}
}


function get_dong_data($kiot_api, $kiot_sensor) {
	global $pday;

	$start = sprintf("%04d/%02d/%02d-00:00:00", $pday['year'], $pday['month'], $pday['day']);
	$end = sprintf("%04d/%02d/%02d-23:59:59", $pday['year'], $pday['month'], $pday['day']);

	$rep_str1 = array("%start%", "%end%", "%sensor%");
	$rep_str2 = array($start, $end, $kiot_sensor);
	$api = str_replace($rep_str1, $rep_str2, $kiot_api);

	$ch = curl_init($api);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	$api_data = curl_exec($ch);
	if(curl_errno($ch)) {
		curl_close($ch);
		header("HTTP/1.1 500 Internal Server Error");
		exit;
	}
	curl_close($ch);

	$data_arr = json_decode($api_data, true);
	unset($api_data);

	$data = array();
	foreach ($data_arr as $key => $tags) {
		$dcode = $tags['tags']['dcode'];
		$sensor = $tags['tags']['sensor'];
		foreach ($tags['dps'] as $dps => $value) {
			$data[$dcode][$dps][$sensor] = $value;
		}

		//break;
	}
	unset($data_arr);

	return $data;
}

function return_dong_data($data, $kiot_sensor) {
	header('Content-Type: text/plain');
	echo "dcode,tm," . str_replace('|', ',', $kiot_sensor) . "\n";

	foreach ($data as $dcode => $dps) {
		foreach ($dps as $key => $value) {
			echo	$dcode . "," .
				date("YmdHi", $key) . "," .
				$value['pm10'] . "," .
				$value['pm10_grade'] . "," .
				$value['pm25'] . "," .
				$value['pm25_grade'] .  "\n";
		}
	}
}


?>
