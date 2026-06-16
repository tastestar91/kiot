<?php

/**
 * lib.inc
 */

$dev_map = array(
	'DAWONDNS-B540_W-e298069cf478' => 'HUM_217EFCB6',
	'DAWONDNS-B540_W-42f5200946c0' => 'HUM_217EFCBA',
	'DAWONDNS-B540_W-42f52009405a' => 'HUM_217EFCB8',
	'DAWONDNS-B540_W-e298069cf4bc' => 'HUM_217D4694',
	'DAWONDNS-B540_W-e298069cf4be' => 'HUM_217D4691',
	'DAWONDNS-B540_W-42f520082b7c' => 'HUM_217D469C',
	'DAWONDNS-B540_W-e298069cf4b0' => 'HUM_21E5B8EC',
	'DAWONDNS-B540_W-e298069cf4ab' => 'HUM_217D4686',
	'DAWONDNS-B540_W-e298069cf4bf' => 'HUM_217D468E',
	'DAWONDNS-B540_W-e298069cf409' => 'HUM_217EFCAD',
	'DAWONDNS-B540_W-e298069cf490' => 'HUM_217D4692',
	'DAWONDNS-B540_W-e298069cf3f9' => 'HUM_217D4699',
	'DAWONDNS-B540_W-e298069caa79' => 'HUM_217EFCB5',
	//'DAWONDNS-B540_W-42f52008d53d' => null,
	//'DAWONDNS-B540_W-42f52009451b' => null,
	'DAWONDNS-B540_W-e298069cf145' => 'HUM_217D4685',
	'DAWONDNS-B540_W-42f52007db83' => 'HUM_219332F5',
);


function call_kiot_api($device_id, $cumul_power) {
	global $dev_map;

	if (empty($dev_map[$device_id])) {
		error_log("realtimedata: call_kiot_api dev_map error, device_id={$device_id}, cumul_power={$cumul_power}");
		return;
	}

	$url = "http://kiotigrt.kweather.co.kr:20001/v1/sensors/kw-vsep1?serial={$dev_map[$device_id]}&watt={$cumul_power}";
	//error_log("realtimedata: call_kiot_api, {$url}");

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $api_data = curl_exec($ch);
        if (curl_errno($ch)) {
                curl_close($ch);
		error_log("realtimedata: call_kiot_api kiot api error, device_id={$device_id}, cumul_power={$cumul_power}, url={$url}");
                return;
        }
        curl_close($ch);
        return;
}

?>
