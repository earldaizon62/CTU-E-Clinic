<?php
session_start();
require 'config.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT s.*, sp.contact_number, sp.email_address, sp.allergies, sp.medications, sp.medical_conditions FROM students s LEFT JOIN student_profiles sp ON s.student_id = sp.student_id");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare("INSERT INTO students (name, student_id, course, section) VALUES (?, ?, ?, ?)");
    $stmt->execute([$data['name'], $data['idNumber'], $data['course'], $data['section']]);
    echo json_encode(['success' => true]);
} elseif ($method === 'DELETE') {
    $id = $_GET['id'];
    $stmt = $pdo->prepare("DELETE FROM students WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);
} elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'];
    $stmt = $pdo->prepare("UPDATE students SET name = ?, student_id = ?, course = ?, section = ? WHERE id = ?");
    $stmt->execute([$data['name'], $data['idNumber'], $data['course'], $data['section'], $id]);
    echo json_encode(['success' => true]);
}
?>