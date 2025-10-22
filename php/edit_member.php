<?php
include 'db.php';
session_start();

$user = $_SESSION['user'] ?? null;
if (!$user) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$id   = (int)($data['id'] ?? 0);
$name = trim($data['name'] ?? '');
$role = trim($data['role'] ?? '');
$new_club_id = (int)($data['club_id'] ?? 0); // ✅ CAPTURE new club_id

if (!$id || !$name || !$role || !$new_club_id) { // ✅ Validate new_club_id too
    echo json_encode(["success" => false, "message" => "Missing fields or invalid club ID."]);
    exit;
}

// Find member’s OLD club
$stmt = $pdo->prepare("SELECT club_id FROM members WHERE id = ?");
$stmt->execute([$id]);
$member = $stmt->fetch();

if (!$member) {
    echo json_encode(["success" => false, "message" => "Member not found"]);
    exit;
}

$old_club_id = $member['club_id'];

// 🚫 Normal users cannot edit
if ($user['role'] === 'user' || $user['role'] === 'member') {
    echo json_encode(["success" => false, "message" => "Permission denied"]);
    exit;
}

// ✅ Staff check assigned clubs
// Staff must be assigned to either the OLD club OR the NEW club to perform the transfer.
if ($user['role'] === 'staff') {
    $check_old = $pdo->prepare("SELECT 1 FROM account_clubs WHERE account_id = ? AND club_id = ?");
    $check_old->execute([$user['id'], $old_club_id]);
    
    $check_new = $pdo->prepare("SELECT 1 FROM account_clubs WHERE account_id = ? AND club_id = ?");
    $check_new->execute([$user['id'], $new_club_id]);

    if (!$check_old->fetch() && !$check_new->fetch()) {
        echo json_encode(["success" => false, "message" => "Not allowed to edit members of the old or new club."]);
        exit;
    }
}

// Update
// ✅ INCLUDE club_id in the update query
$stmt = $pdo->prepare("UPDATE members SET name = ?, role = ?, club_id = ? WHERE id = ?");
if ($stmt->execute([$name, $role, $new_club_id, $id])) { // ✅ PASS new_club_id in execute array
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "Error updating member"]);
}