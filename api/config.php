<?php
$host = getenv('mysql.railway.internal');
$port = getenv('3306');
$db   = getenv('railway');
$user = getenv('root');
$pass = getenv('TwoDpQJvFSAaZmwclOFnRuHmDRPdoDzC');

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$db",
        $user,
        $pass
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    error_log("DB Connection failed: " . $e->getMessage());
    header('Content-Type: application/json');
    die(json_encode(['error' => 'Database connection failed']));
}
?>