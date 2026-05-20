<?php
header('Content-Type: application/json');
$host = getenv('mysql.railway.internal');
$port = getenv('3306');
$db   = getenv('railway');
$user = getenv('root');
$pass = getenv('TwoDpQJvFSAaZmwclOFnRuHmDRPdoDzC');
echo json_encode([
    'host'     => $host ?: 'EMPTY',
    'port'     => $port ?: 'EMPTY',
    'db'       => $db   ?: 'EMPTY',
    'user'     => $user ?: 'EMPTY',
    'pass_set' => $pass ? 'YES' : 'EMPTY'
]);
?>