<?php
require 'config.php'; // sets session cookie options
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$method    = $_SERVER['REQUEST_METHOD'];
$role      = $_SESSION['role'];
$studentId = (string) $_SESSION['student_id'];

if ($method === 'GET') {
    if ($role === 'admin') {
        $stmt = $pdo->query("SELECT * FROM appointments ORDER BY date DESC");
    } else {
        $stmt = $pdo->prepare("SELECT * FROM appointments WHERE student_id = ? ORDER BY date DESC");
        $stmt->execute([$studentId]);
    }
    echo json_encode($stmt->fetchAll());

} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if ($role !== 'admin' && (string)$data['id'] !== $studentId) {
        http_response_code(403);
        echo json_encode(['error' => 'Can only book own appointments']);
        exit;
    }

    $studentCheck = $pdo->prepare("SELECT id FROM students WHERE student_id = ?");
    $studentCheck->execute([$data['id']]);
    if (!$studentCheck->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'Student ID not found']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO appointments (student_id, name, date, time, concern, status) VALUES (?, ?, ?, ?, ?, 'Pending')");
        $stmt->execute([$data['id'], $data['name'], $data['date'], $data['time'], $data['concern']]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        error_log("Appointment insert error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Unable to save appointment']);
    }

} elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id   = $data['id'];

    $stmt = $pdo->prepare("SELECT * FROM appointments WHERE id = ?");
    $stmt->execute([$id]);
    $appt = $stmt->fetch();

    if (!$appt) {
        http_response_code(404);
        echo json_encode(['error' => 'Appointment not found']);
        exit;
    }

    if ($role !== 'admin' && (string)$appt['student_id'] !== $studentId) {
        http_response_code(403);
        echo json_encode(['error' => 'Can only edit own appointments']);
        exit;
    }

    if ($role !== 'admin' && $appt['status'] !== 'Pending') {
        http_response_code(403);
        echo json_encode(['error' => 'Can only edit pending appointments']);
        exit;
    }

    if ($role === 'admin' && isset($data['status'])) {
        $stmt = $pdo->prepare("UPDATE appointments SET status = ?, admin_notes = ? WHERE id = ?");
        $stmt->execute([$data['status'], $data['admin_notes'] ?? '', $id]);
    } else {
        $stmt = $pdo->prepare("UPDATE appointments SET date = ?, time = ?, concern = ? WHERE id = ?");
        $stmt->execute([$data['date'], $data['time'], $data['concern'], $id]);
    }
    echo json_encode(['success' => true]);

} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Appointment ID required']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM appointments WHERE id = ?");
    $stmt->execute([$id]);
    $appt = $stmt->fetch();

    if (!$appt) {
        http_response_code(404);
        echo json_encode(['error' => 'Appointment not found']);
        exit;
    }

    if ($role !== 'admin' && (string)$appt['student_id'] !== $studentId) {
        http_response_code(403);
        echo json_encode(['error' => 'Can only delete own appointments']);
        exit;
    }

    $stmt = $pdo->prepare("DELETE FROM appointments WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);
}
?>
