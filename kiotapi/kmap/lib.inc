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

function disp_result($result) {
	header('Content-Type: application/json; charset=utf-8');
	echo json_encode($result);
}

?>
