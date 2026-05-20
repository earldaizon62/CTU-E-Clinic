<?php
header('Content-Type: application/json');

$host = getenv('MYSQLHOST');
$port = getenv('MYSQLPORT');
$db   = getenv('MYSQLDATABASE');
$user = getenv('MYSQLUSER');
$pass = getenv('MYSQLPASSWORD');

echo json_encode([
    'host'     => $host ?: 'EMPTY',
    'port'     => $port ?: 'EMPTY',
    'db'       => $db   ?: 'EMPTY',
    'user'     => $user ?: 'EMPTY',
    'pass_set' => $pass ? 'YES' : 'EMPTY'
]);
?>