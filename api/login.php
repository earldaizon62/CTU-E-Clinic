<?php
session_start();
require 'config.php';

// FIX: Missing header caused login response to be misread by browser
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

// FIX: Missing input validation — crashed if fields were empty
if (empty($data['username']) || empty($data['password'])) {
    echo json_encode(['success' => false, 'message' => 'Missing credentials']);
    exit;
}

$username = trim($data['username']);
$password = $data['password'];

$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch();

if ($user && password_verify($password, $user['password'])) {
    // FIX: Regenerate session ID to prevent session fixation attacks
    session_regenerate_id(true);
    $_SESSION['user_id']   = $user['id'];
    $_SESSION['role']      = $user['role'];
    $_SESSION['student_id'] = $user['student_id'];
    echo json_encode([
        'success'    => true,
        'role'       => $user['role'],
        'student_id' => $user['student_id']
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
}
?>