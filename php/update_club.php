<?php
session_start();
include 'db.php';

header("Content-Type: application/json");

if (!isset($_SESSION['user'])) {
    echo json_encode(["success" => false, "message" => "Unauthorized"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$id   = intval($data['id'] ?? 0);
$name = trim($data['name'] ?? '');
$desc = trim($data['description'] ?? '');

if ($id <= 0 || $name === '' || $desc === '') {
    echo json_encode(["success" => false, "message" => "Invalid data"]);
    exit;
}

$user = $_SESSION['user'];

try {
    if ($user['role'] === 'admin') {
        // ✅ Admin can update any club
        $stmt = $pdo->prepare("UPDATE clubs SET name = ?, description = ? WHERE id = ?");
        $stmt->execute([$name, $desc, $id]);

    } elseif ($user['role'] === 'staff') {
        // ✅ Staff can only update their assigned clubs
        $stmt = $pdo->prepare("
            UPDATE clubs c
            JOIN account_clubs ac ON ac.club_id = c.id
            SET c.name = ?, c.description = ?
            WHERE c.id = ? AND ac.account_id = ?
        ");
        $stmt->execute([$name, $desc, $id, $user['id']]);

        if ($stmt->rowCount() === 0) {
            echo json_encode(["success" => false, "message" => "Not allowed to edit this club"]);
            exit;
        }

    } else {
        echo json_encode(["success" => false, "message" => "Unauthorized"]);
        exit;
    }

    echo json_encode(["success" => true, "message" => "Club updated"]);
} catch (Exception $e) {
    error_log("UPDATE_CLUB error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "DB error"]);
}
