<?php
require 'config.php';

$data = json_decode(file_get_contents('php://input'), true);
$username = isset($data['username']) ? trim($data['username']) : '';
$studentId = isset($data['studentId']) ? trim($data['studentId']) : '';
$password = isset($data['password']) ? password_hash($data['password'], PASSWORD_DEFAULT) : '';

// Basic validation
if (!$username || !$studentId || !$password) {
    echo json_encode(['success' => false, 'message' => 'Please provide username, student ID, and password']);
    exit;
}

// Check if student exists
// Debug log for received values (server log only)
error_log("Signup attempt for username={$username}, studentId={$studentId}");

$stmt = $pdo->prepare("SELECT * FROM students WHERE student_id = ?");
$stmt->execute([$studentId]);
$student = $stmt->fetch();

if (!$student) {
    // Provide a helpful message but avoid leaking DB content
    error_log("Student lookup failed for studentId={$studentId}");
    echo json_encode(['success' => false, 'message' => 'Invalid student ID. Make sure you entered the exact student ID (no extra spaces).']);
    exit;
}

// Check duplicate username
$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
$stmt->execute([$username]);
if ($stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Username taken']);
    exit;
}

$stmt = $pdo->prepare("INSERT INTO users (username, password, role, student_id) VALUES (?, ?, 'student', ?)");
if ($stmt->execute([$username, $password, $studentId])) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Signup failed']);
}
?>