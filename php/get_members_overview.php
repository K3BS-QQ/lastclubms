<?php
session_start();
header('Content-Type: application/json');
require 'db.php';

$user = $_SESSION['user'] ?? null;
if (!$user) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

try {
    // ✅ Everyone (admin, staff, member) can see total members in dashboard
    $stmt = $pdo->query("
        SELECT m.id, m.name, m.role, m.club_id, c.name AS club_name
        FROM members m
        JOIN clubs c ON m.club_id = c.id
        ORDER BY c.name, m.name
    ");
    
    $members = $stmt->fetchAll();

    // 🚫 In dashboard → no edit/delete rights
    foreach ($members as &$member) {
        $member['can_edit'] = false;
        $member['can_delete'] = false;
    }

    echo json_encode(["success" => true, "members" => $members]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Error loading members overview"]);
}
