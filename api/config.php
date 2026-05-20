<?php
$host = 'mysql.railway.internal';
$port = '3306';
$db   = 'railway';
$user = 'root';
$pass = 'TwoDpQJvFSAaZmwclOFnRuHmDRPdoDzC';

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