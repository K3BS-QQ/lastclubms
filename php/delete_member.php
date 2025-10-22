<?php
include 'db.php';
session_start();

$user = $_SESSION['user'] ?? null;
if (!$user) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$id = (int)($data['id'] ?? 0);

error_log("DELETE called by user={$user['id']} on member_id={$id}");

if (!$id) {
    echo json_encode(["success" => false, "message" => "Missing member ID"]);
    exit;
}

// Find member’s club
$stmt = $pdo->prepare("SELECT club_id FROM members WHERE id = ?");
$stmt->execute([$id]);
$member = $stmt->fetch();

if (!$member) {
    echo json_encode(["success" => false, "message" => "Member not found"]);
    exit;
}

$club_id = $member['club_id'];

// 🚫 Normal users cannot delete
if ($user['role'] === 'user' || $user['role'] === 'member') {
    echo json_encode(["success" => false, "message" => "Permission denied"]);
    exit;
}

// ✅ Staff can only delete members in their assigned clubs
if ($user['role'] === 'staff') {
    $check = $pdo->prepare("SELECT 1 FROM account_clubs WHERE account_id = ? AND club_id = ?");
    $check->execute([$user['id'], $club_id]);
    if (!$check->fetch()) {
        echo json_encode(["success" => false, "message" => "Not allowed to delete members of this club"]);
        exit;
    }
}

// Delete
$stmt = $pdo->prepare("DELETE FROM members WHERE id = ?");
if ($stmt->execute([$id])) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "Error deleting member"]);
}
