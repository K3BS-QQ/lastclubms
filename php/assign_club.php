<?php
include 'db.php';
session_start();

$user = $_SESSION['user'] ?? null;

if (!$user || $user['role'] !== 'admin') {
    echo json_encode(["success" => false, "message" => "Permission denied"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$accountId = (int)($data['accountId'] ?? 0);
$role = trim($data['role'] ?? '');
$clubs = $data['clubs'] ?? [];

if (!$accountId || !$role || empty($clubs)) {
    echo json_encode(["success" => false, "message" => "Missing fields"]);
    exit;
}

// ✅ Update the account role
$stmt = $pdo->prepare("UPDATE accounts SET role = ? WHERE id = ?");
$stmt->execute([$role, $accountId]);

// ✅ Clear old club assignments
$stmt = $pdo->prepare("DELETE FROM account_clubs WHERE staff_id = ?");
$stmt->execute([$accountId]);

// ✅ Insert new club assignments
$stmt = $pdo->prepare("INSERT INTO account_clubs (staff_id, club_id, created_at) VALUES (?, ?, NOW())");
foreach ($clubs as $clubId) {
    $stmt->execute([$accountId, $clubId]);
}

echo json_encode(["success" => true, "message" => "Clubs assigned successfully"]);
