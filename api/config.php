<?php
// ============================================================
// Session security settings — must be set BEFORE session_start()
// These apply to every file that requires this config.
// ============================================================
ini_set('session.cookie_secure',   '1');  // HTTPS only (Railway is always HTTPS)
ini_set('session.cookie_httponly', '1');  // Block JS from reading the session cookie
ini_set('session.cookie_samesite', 'Lax'); // Allows normal navigation, blocks CSRF

// ============================================================
// Database — reads Railway's auto-injected environment variables.
// In Railway: add a MySQL plugin and these vars are set automatically.
// Fallbacks are for local dev (copy .env.example and fill in values).
// ============================================================
$host = getenv('MYSQLHOST')     ?: getenv('DB_HOST') ?: 'localhost';
$port = getenv('MYSQLPORT')     ?: getenv('DB_PORT') ?: '3306';
$db   = getenv('MYSQLDATABASE') ?: getenv('DB_NAME') ?: 'eclinic';
$user = getenv('MYSQLUSER')     ?: getenv('DB_USER') ?: 'root';
$pass = getenv('MYSQLPASSWORD') ?: getenv('DB_PASS') ?: '';

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4",
        $user,
        $pass
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE,        PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    error_log("DB Connection failed: " . $e->getMessage());
    header('Content-Type: application/json');
    http_response_code(500);
    die(json_encode(['error' => 'Database connection failed']));
}
?>
