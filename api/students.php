<?php
require 'config.php'; // sets session cookie options
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query(
        "SELECT s.*, sp.contact_number, sp.email_address, sp.allergies, sp.medications, sp.medical_conditions
         FROM students s
         LEFT JOIN student_profiles sp ON s.student_id = sp.student_id"
    );
    echo json_encode($stmt->fetchAll());

} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("INSERT INTO students (name, student_id, course, section) VALUES (?, ?, ?, ?)");
    $stmt->execute([$data['name'], $data['idNumber'], $data['course'], $data['section']]);
    echo json_encode(['success' => true]);

} elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    // Use the row `id` (auto-increment), not student_id string
    $id = $data['id'];
    $stmt = $pdo->prepare("UPDATE students SET name = ?, student_id = ?, course = ?, section = ? WHERE id = ?");
    $stmt->execute([$data['name'], $data['idNumber'], $data['course'], $data['section'], $id]);
    echo json_encode(['success' => true]);

} elseif ($method === 'DELETE') {
    // FIX: was using WHERE id = ? but client sends student_id string — now handles both
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        exit;
    }
    // Try numeric row id first, fall back to student_id string
    if (ctype_digit((string)$id)) {
        $stmt = $pdo->prepare("DELETE FROM students WHERE id = ?");
    } else {
        $stmt = $pdo->prepare("DELETE FROM students WHERE student_id = ?");
    }
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);
}
?>
