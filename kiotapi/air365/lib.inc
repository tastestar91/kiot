<?php

/**
 * lib.inc
 */

function check_auth() {
	global $auth_ip;
	if (!in_array($_SERVER['REMOTE_ADDR'], $auth_ip) && substr($_SERVER['REMOTE_ADDR'], 0, 12)!='211.219.114.') {
		header("HTTP/1.1 401 Unauthorized");
		exit;
	}
}

function disp_result() {
	global $result_arr;
	header('Content-Type: application/json; charset=utf-8');
	echo json_encode($result_arr);
	unset($result_arr);
	exit;
}

function get_kiot_data($url) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	   curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $api_data = curl_exec($ch);
        if (curl_errno($ch)) {
                curl_close($ch);
                return null;
        }
        curl_close($ch);

        $data = json_decode($api_data, true);
        unset($api_data);

        return $data;
}

function post_kiot_data($url, $body) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
	curl_setopt($ch, CURLOPT_TIMEOUT, 10);
	curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Content-Length: ' . strlen($body)));
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $api_data = curl_exec($ch);
        if (curl_errno($ch)) {
                curl_close($ch);
		return null;
	}
	curl_close($ch);

	$data = json_decode($api_data, true);
	unset($api_data);

        return $data;
}

function get_sensor_round($sensor, $value) {
	switch ($sensor) {
		case 'temp':
		case 'windd':
		case 'windd_max':
		case 'winds':
		case 'winds_max':
		case 'uv':
		case 'wbgt':
		case 'hcho':
		case 'atm':
			$value = round($value, 1);
			break;

		case 'accx':
		case 'accx_max':
		case 'accy':
		case 'accy_max':
		case 'accz':
		case 'accz_max':
			$value = round($value, 2);
			break;

		case 'co':
		case 'o3':
		case 'no2':
		case 'so2':
		case 'nh3':
		case 'h2s':
			$value = round($value, 3);
			break;
		default:
			$value = round($value);
			break;
	}

	return $value;
}

// ------------------------------------------------------------------


/* get ir data */

function get_irdata() {
	global $result_arr;
	global $kiot_api_ir;
	global $kiot_sensor_ir;

	/* get kiot data */
	switch ($result_arr['param']['searchType']) {
		case '0':
			$url = str_replace('%serial%', $result_arr['param']['searchParam'], $kiot_api_ir[$result_arr['param']['deviceType']]);
			break;

		case '1':
			$url = str_replace('%id%', $result_arr['param']['searchParam'], $kiot_api_ir['USER']);
			break;

		case '2':
			$url = str_replace('%id%', $result_arr['param']['searchParam'], $kiot_api_ir['GROUP']);
			break;

		default :
			$result_arr['result_message'] = 'param error: searchType';
			disp_result();
			return;
	}

	$kiot_data = get_kiot_data($url);
	if (is_null($kiot_data)) {
		error_log('get_irdata: get_kiot_data error, url=' . $url);
		$result_arr['result_message'] = 'server error: get_kiot_data';
		disp_result();
		return;
	}

	/* make return data */
	if ($result_arr['param']['searchType'] == 0) {
		if (empty($kiot_data) || empty($kiot_data['service']['timestamp']) || empty($kiot_data['data'])) {
			$result_arr['count'] = 0;
			return;
		}

		$data = array();
		$i = 0;
		$data[$i]['serial'] = $result_arr['param']['searchParam'];
		$data[$i]['tm'] = date('YmdHi', $kiot_data['service']['timestamp']);
		foreach($kiot_data['data'] as $key => $value) {
			if (in_array($key, $kiot_sensor_ir[$result_arr['param']['deviceType']])) {
				$data[$i][$key] = $value;
			}
		}
		$result_arr['count'] = 1;
		$result_arr['data'] = $data;
	}
	else {
		$data = array();
		$i = 0;
		foreach($kiot_data as $key => $value) {
			if (empty($value['service']['timestamp']) || empty($value['data'])) {
				continue;
			}

			$tmp = array();
			$tmp['serial'] = $key;
			$tmp['tm'] = date('YmdHi', $value['service']['timestamp']);
			$j = 0;
			foreach($value['data'] as $key1 => $value1) {
				if (in_array($key1, $kiot_sensor_ir['ALL'])) {
					$tmp[$key1] = $value1;
					$j++;
				}
			}
			if ($j > 0) {
				$data[$i++] = $tmp;
			}
		}
		$result_arr['count'] = $i;
		$result_arr['data'] = $data;
	}
}


/* get statistics data */

function get_stdata() {
	global $result_arr;
	global $kiot_api_st;
	global $kiot_sensor_ir;
	global $kiot_sensor_st;

	$kiot_data = array();
	$rep_str1 = array("%start%", "%end%", "%serial%");
	$rep_str2 = array(str_replace('-', '/', $result_arr['param']['searchFromDate']),
			  str_replace('-', '/', $result_arr['param']['searchToDate']),
	       		  $result_arr['param']['serialNum']);

	/* get kiot data */
	if ($result_arr['param']['searchType'] == 'all') {
		$url = str_replace($rep_str1, $rep_str2, $kiot_api_st[$result_arr['param']['deviceType']]['all']);
		$kiot_data = get_kiot_data($url);
		if (is_null($kiot_data)) {
			error_log('get_stdata: get_kiot_data error, url=' . $url);
			$result_arr['result_message'] = 'server error: get_kiot_data';
			disp_result();
			return;
		}
	}
	else if ($result_arr['param']['searchType'] == 'visitor') {
		$url = str_replace($rep_str1, $rep_str2, $kiot_api_st[$result_arr['param']['deviceType']]['visitor']);
		$kiot_data = get_kiot_data($url);
		if (is_null($kiot_data)) {
			error_log('get_stdata: get_kiot_data error, url=' . $url);
			$result_arr['result_message'] = 'server error: get_kiot_data';
			disp_result();
			return;
		}
	}
	else if ($result_arr['param']['searchType'] == 'pmraw') {
		$url = str_replace($rep_str1, $rep_str2, $kiot_api_st[$result_arr['param']['deviceType']]['pmraw']);
		$kiot_data = get_kiot_data($url);
		if (is_null($kiot_data)) {
			error_log('get_stdata: get_kiot_data error, url=' . $url);
			$result_arr['result_message'] = 'server error: get_kiot_data';
			disp_result();
			return;
		}
	}
	else if ($result_arr['param']['searchType'] == 'hour') {
		// avg
		$url = str_replace($rep_str1, $rep_str2, $kiot_api_st[$result_arr['param']['deviceType']]['hour']['avg']);
		$kiot_data['avg'] = get_kiot_data($url);
		if (is_null($kiot_data['avg'])) {
			error_log('get_stdata: get_kiot_data error, url=' . $url);
			$result_arr['result_message'] = 'server error: get_kiot_data';
			disp_result();
			return;
		}

		// min
		$url = str_replace($rep_str1, $rep_str2, $kiot_api_st[$result_arr['param']['deviceType']]['hour']['min']);
		$kiot_data['min'] = get_kiot_data($url);
		if (is_null($kiot_data['min'])) {
			error_log('get_stdata: get_kiot_data error, url=' . $url);
			$result_arr['result_message'] = 'server error: get_kiot_data';
			disp_result();
			return;
		}

		// max
		$url = str_replace($rep_str1, $rep_str2, $kiot_api_st[$result_arr['param']['deviceType']]['hour']['max']);
		$kiot_data['max'] = get_kiot_data($url);
		if (is_null($kiot_data['max'])) {
			error_log('get_stdata: get_kiot_data error, url=' . $url);
			$result_arr['result_message'] = 'server error: get_kiot_data';
			disp_result();
			return;
		}
	}
	else if ($result_arr['param']['searchType'] == 'day') {
		// avg
		$url = $kiot_api_st[$result_arr['param']['deviceType']]['day']['url'];
		$body = str_replace($rep_str1, $rep_str2, $kiot_api_st[$result_arr['param']['deviceType']]['day']['avg']);
		$kiot_data['avg'] = post_kiot_data($url, $body);
		if (is_null($kiot_data['avg'])) {
			error_log('get_stdata: post_kiot_data error, avg url=' . $url);
			$result_arr['result_message'] = 'server error: post_kiot_data';
			disp_result();
			return;
		}

		// min
		$url = $kiot_api_st[$result_arr['param']['deviceType']]['day']['url'];
		$body = str_replace($rep_str1, $rep_str2, $kiot_api_st[$result_arr['param']['deviceType']]['day']['min']);
		$kiot_data['min'] = post_kiot_data($url, $body);
		if (is_null($kiot_data['min'])) {
			error_log('get_stdata: post_kiot_data error, min url=' . $url);
			$result_arr['result_message'] = 'server error: post_kiot_data';
			disp_result();
			return;
		}

		// max
		$url = $kiot_api_st[$result_arr['param']['deviceType']]['day']['url'];
		$body = str_replace($rep_str1, $rep_str2, $kiot_api_st[$result_arr['param']['deviceType']]['day']['max']);
		$kiot_data['max'] = post_kiot_data($url, $body);
		if (is_null($kiot_data['max'])) {
			error_log('get_stdata: post_kiot_data error, max url=' . $url);
			$result_arr['result_message'] = 'server error: post_kiot_data';
			disp_result();
			return;
		}
	}
	else {
		$result_arr['result_message'] = 'param error: searchType';
		disp_result();
		return;
	}

	/* make return data */
	if ($result_arr['param']['searchType'] == 'all') {
		$data = array();
		foreach ($kiot_data as $key => $tags) {
			$sensor = $tags['tags']['sensor'];
			if (in_array($sensor, $kiot_sensor_ir[$result_arr['param']['deviceType']])) {
	       			foreach ($tags['dps'] as $dps => $value) {
	                		$data[$dps][$sensor] = $value;
	       			}
			}
        	}
		unset($kiot_data);

		$i = 0;
		foreach ($data as $dps => $value) {
			$tmp = array();
			$tmp['tm'] = date("YmdHi", $dps);
			$result_arr['data'][$i++] = array_merge($tmp, $value);
		}
		unset($data);
		$result_arr['count'] = $i;
	}
	else if ($result_arr['param']['searchType'] == 'visitor') {
		$data = array();
		foreach ($kiot_data as $key => $tags) {
			$sensor = $tags['tags']['sensor'];
			if (in_array($sensor, $kiot_sensor_ir['VISITOR'])) {
	       			foreach ($tags['dps'] as $dps => $value) {
	                		$data[$dps][$sensor] = $value;
	       			}
			}
        	}
		unset($kiot_data);

		$i = 0;
		foreach ($data as $dps => $value) {
			$tmp = array();
			$tmp['tm'] = date("YmdHi", $dps);
			$result_arr['data'][$i++] = array_merge($tmp, $value);
		}
		unset($data);
		$result_arr['count'] = $i;
	}
	else if ($result_arr['param']['searchType'] == 'pmraw') {
		$data = array();
		foreach ($kiot_data as $key => $tags) {
			$sensor = $tags['tags']['sensor'];
			if (in_array($sensor, $kiot_sensor_ir['PMRAW'])) {
	       			foreach ($tags['dps'] as $dps => $value) {
	                		$data[$dps][$sensor] = $value;
	       			}
			}
        	}
		unset($kiot_data);

		$i = 0;
		foreach ($data as $dps => $value) {
			$tmp = array();
			$tmp['tm'] = date("YmdHi", $dps);
			$result_arr['data'][$i++] = array_merge($tmp, $value);
		}
		unset($data);
		$result_arr['count'] = $i;
	}
	else {
		// avg
		$data = array();
		foreach ($kiot_data['avg'] as $key => $tags) {
			$sensor = $tags['tags']['sensor'];
			if (in_array($sensor, $kiot_sensor_st[$result_arr['param']['deviceType']])) {
	       			foreach ($tags['dps'] as $dps => $value) {
					$data[$dps]['avg'][$sensor] = get_sensor_round($sensor, $value);
	       			}
			}
        	}
		foreach ($kiot_data['min'] as $key => $tags) {
			$sensor = $tags['tags']['sensor'];
			if (in_array($sensor, $kiot_sensor_st[$result_arr['param']['deviceType']])) {
	       			foreach ($tags['dps'] as $dps => $value) {
					$data[$dps]['min'][$sensor] = get_sensor_round($sensor, $value);
	       			}
			}
        	}
		foreach ($kiot_data['max'] as $key => $tags) {
			$sensor = $tags['tags']['sensor'];
			if (in_array($sensor, $kiot_sensor_st[$result_arr['param']['deviceType']])) {
	       			foreach ($tags['dps'] as $dps => $value) {
					$data[$dps]['max'][$sensor] = get_sensor_round($sensor, $value);
	       			}
			}
        	}
		unset($kiot_data);
		$i = 0;
		if ($result_arr['param']['searchType'] == 'hour') $format = 'YmdH';
		else $format = 'Ymd';

		foreach ($data as $dps => $value) {
			$tmp = array();
			$tmp['tm'] = date($format, $dps);
			$result_arr['data'][$i++] = array_merge($tmp, $value);
		}
		unset($data);
		$result_arr['count'] = $i;
	}
}

?>
