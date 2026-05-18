<?php
session_start();
require 'config.php';
 
header('Content-Type: application/json');
 
// Auth check — was completely missing before
if (!isset($_SESSION['user_id'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}
 
$method = $_SERVER['REQUEST_METHOD'];
$role = $_SESSION['role'];
 
switch ($method) {
    case 'GET':
        $student_id = $_GET['student_id'] ?? null;
        // Students can only fetch their own queries
        if ($role !== 'admin' && $student_id !== $_SESSION['student_id']) {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        if ($student_id) {
            $stmt = $pdo->prepare("SELECT * FROM queries WHERE student_id = ? ORDER BY submitted_at DESC");
            $stmt->execute([$student_id]);
        } else {
            if ($role !== 'admin') {
                http_response_code(403);
                echo json_encode(['error' => 'Unauthorized']);
                exit;
            }
            $stmt = $pdo->query("SELECT * FROM queries ORDER BY submitted_at DESC");
        }
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;
 
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $student_id   = trim($data['student_id'] ?? '');
        $student_name = trim($data['student_name'] ?? '');
        $type         = trim($data['type'] ?? '');
        $message      = trim($data['message'] ?? '');
 
        if (!$student_id || !$student_name || !$type || !$message) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
            exit;
        }
 
        // Students can only submit queries for themselves
        if ($role !== 'admin' && $student_id !== $_SESSION['student_id']) {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
 
        $stmt = $pdo->prepare("INSERT INTO queries (student_id, student_name, type, message) VALUES (?, ?, ?, ?)");
        if ($stmt->execute([$student_id, $student_name, $type, $message])) {
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to submit query']);
        }
        break;
 
    case 'PUT':
        // Only admins can respond/resolve queries
        if ($role !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
 
        $data     = json_decode(file_get_contents('php://input'), true);
        $id       = $data['id'] ?? '';
        $status   = $data['status'] ?? '';
        $response = $data['response'] ?? '';
 
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Query ID required']);
            exit;
        }
 
        if ($status === 'Resolved') {
            $stmt = $pdo->prepare("UPDATE queries SET status = ?, response = ?, resolved_at = NOW() WHERE id = ?");
            $stmt->execute([$status, $response, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE queries SET response = ? WHERE id = ?");
            $stmt->execute([$response, $id]);
        }
 
        echo json_encode(['success' => true]);
        break;
 
    case 'DELETE':
        // Only admins can delete queries
        if ($role !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
 
        $id = $_GET['id'] ?? '';
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Query ID required']);
            exit;
        }
 
        $stmt = $pdo->prepare("DELETE FROM queries WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;
 
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Invalid method']);
        break;
}
?>