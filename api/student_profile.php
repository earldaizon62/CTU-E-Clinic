<?php
session_start();
require 'config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized', 'message' => 'Unauthorized']);
    exit;
}

$role      = $_SESSION['role'];
$studentId = $_SESSION['student_id'] ?? null;
$method    = $_SERVER['REQUEST_METHOD'];

// Ensure student_profiles table exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS student_profiles (
        student_id VARCHAR(50) PRIMARY KEY,
        contact_number VARCHAR(50),
        email_address VARCHAR(255),
        allergies TEXT,
        medications TEXT,
        medical_conditions TEXT,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
    )");
} catch (PDOException $e) {
    // Table may already exist, continue
}

if ($method === 'GET') {
    try {
        if ($role === 'admin') {
            $params = [];
            $sql = "SELECT s.*, sp.contact_number, sp.email_address, sp.allergies, sp.medications, sp.medical_conditions
                    FROM students s
                    LEFT JOIN student_profiles sp ON s.student_id = sp.student_id";

            if (!empty($_GET['student_id'])) {
                $sql .= " WHERE s.student_id = ?";
                $params[] = $_GET['student_id'];
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($results);
            exit;
        }

        // FIX: student_id missing from session means the user account
        // was created without linking to a student record
        if (!$studentId) {
            http_response_code(400);
            echo json_encode([
                'error'   => 'No student ID linked to this account',
                'message' => 'No student ID linked to this account. Contact admin.'
            ]);
            exit;
        }

        $stmt = $pdo->prepare(
            "SELECT s.*, sp.contact_number, sp.email_address, sp.allergies, sp.medications, sp.medical_conditions
             FROM students s
             LEFT JOIN student_profiles sp ON s.student_id = sp.student_id
             WHERE s.student_id = ?"
        );
        $stmt->execute([$studentId]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$profile) {
            http_response_code(404);
            echo json_encode([
                'error'   => 'Student profile not found',
                'message' => 'Student profile not found'
            ]);
            exit;
        }

        echo json_encode($profile);
        exit;

    } catch (PDOException $e) {
        error_log("student_profile GET error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Database error', 'message' => 'Database error']);
        exit;
    }
}

if ($method === 'PUT') {
    if ($role !== 'student') {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized', 'message' => 'Unauthorized']);
        exit;
    }

    if (!$studentId) {
        http_response_code(400);
        echo json_encode([
            'error'   => 'No student ID linked to this account',
            'message' => 'No student ID linked to this account. Contact admin.'
        ]);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON data', 'message' => 'Invalid JSON data']);
        exit;
    }

    $name             = trim($data['fullName'] ?? '');
    $course           = trim($data['course'] ?? '');
    $section          = trim($data['section'] ?? '');
    $contactNumber    = trim($data['contactNumber'] ?? '');
    $emailAddress     = trim($data['emailAddress'] ?? '');
    $allergies        = trim($data['allergies'] ?? '');
    $medications      = trim($data['medications'] ?? '');
    $medicalConditions = trim($data['medicalConditions'] ?? '');

    if (!$name || !$course || !$section || !$contactNumber || !$emailAddress) {
        http_response_code(400);
        echo json_encode([
            'error'   => 'Missing required profile fields',
            'message' => 'Please fill in all required fields (name, course, section, contact, email)'
        ]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        $updateStudent = $pdo->prepare(
            'UPDATE students SET name = ?, course = ?, section = ? WHERE student_id = ?'
        );
        $updateStudent->execute([$name, $course, $section, $studentId]);

        $stmt = $pdo->prepare('SELECT student_id FROM student_profiles WHERE student_id = ?');
        $stmt->execute([$studentId]);

        if ($stmt->fetch()) {
            $updateProfile = $pdo->prepare(
                'UPDATE student_profiles SET contact_number = ?, email_address = ?, allergies = ?, medications = ?, medical_conditions = ? WHERE student_id = ?'
            );
            $updateProfile->execute([$contactNumber, $emailAddress, $allergies, $medications, $medicalConditions, $studentId]);
        } else {
            $insertProfile = $pdo->prepare(
                'INSERT INTO student_profiles (student_id, contact_number, email_address, allergies, medications, medical_conditions) VALUES (?, ?, ?, ?, ?, ?)'
            );
            $insertProfile->execute([$studentId, $contactNumber, $emailAddress, $allergies, $medications, $medicalConditions]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Profile saved successfully']);

    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("student_profile PUT error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Database error', 'message' => 'Failed to save profile']);
    }

    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
?>