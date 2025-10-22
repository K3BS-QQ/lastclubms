<?php
session_start();
header('Content-Type: application/json');
require 'db.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    $data = json_decode(file_get_contents('php://input'), true);

    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';

    if (!$username || !$password) {
        echo json_encode([
            'success' => false,
            'message' => 'Username and password are required'
        ]);
        exit;
    }

    // 🔑 Check user
    $stmt = $pdo->prepare("SELECT * FROM accounts WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        // (Optional) Load clubs
        $clubs = [];
        if ($user['role'] === 'member') {
            $clubStmt = $pdo->prepare("
                SELECT c.name 
                FROM club_members cm
                JOIN clubs c ON cm.club_id = c.id
                WHERE cm.member_id = ?
            ");
            $clubStmt->execute([$user['id']]);
            $clubs = $clubStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        $_SESSION['user'] = [
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'clubs' => $clubs
        ];

        echo json_encode([
            'success' => true,
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'clubs' => $clubs
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid username or password'
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
