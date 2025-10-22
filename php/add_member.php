<?php
include 'db.php';
session_start();

$user = $_SESSION['user'] ?? null;
if (!$user) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$name = trim($data['name'] ?? '');
$role = trim($data['role'] ?? '');
$club_id = (int)($data['club_id'] ?? 0);

if (!$name || !$role || !$club_id) {
    echo json_encode(["success" => false, "message" => "Missing fields"]);
    exit;
}

// 🚫 Normal users cannot add
if ($user['role'] === 'user' || $user['role'] === 'member') {
    echo json_encode(["success" => false, "message" => "Permission denied"]);
    exit;
}

// ✅ Staff can only add to clubs they are assigned
if ($user['role'] === 'staff') {
    $check = $pdo->prepare("SELECT 1 FROM account_clubs WHERE account_id = ? AND club_id = ?");
    $check->execute([$user['id'], $club_id]);
    if (!$check->fetch()) {
        echo json_encode(["success" => false, "message" => "Not allowed to add members to this club"]);
        exit;
    }
}

// Insert
$stmt = $pdo->prepare("
    INSERT INTO members (name, role, club_id, joined_at, status)
    VALUES (?, ?, ?, NOW(), 'Active')
");
if ($stmt->execute([$name, $role, $club_id])) {
    echo json_encode(["success" => true, "message" => "Member added"]);
} else {
    echo json_encode(["success" => false, "message" => "Error adding member"]);
}
