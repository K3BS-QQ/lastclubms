<?php
session_start();
header('Content-Type: application/json');
require 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$id = $data['id'] ?? 0;
$name = $data['name'] ?? '';
$role = $data['role'] ?? '';
$club_name = $data['club'] ?? '';

if (!$id || !$name || !$role || !$club_name) {
    echo json_encode(['success' => false, 'message' => 'All fields are required.']);
    exit;
}

// Get club ID
$stmt = $pdo->prepare('SELECT id FROM clubs WHERE name = ?');
$stmt->execute([$club_name]);
$club = $stmt->fetch();
if (!$club) {
    echo json_encode(['success' => false, 'message' => 'Club not found.']);
    exit;
}
$club_id = $club['id'];

// Update member
$stmt = $pdo->prepare('UPDATE members SET name=?, role=?, club_id=?, club_name=? WHERE id=?');
if ($stmt->execute([$name, $role, $club_id, $club_name, $id])) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Error updating member.']);
}
?>
