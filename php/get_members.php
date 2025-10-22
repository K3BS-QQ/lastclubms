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
    $members = [];

    if ($user['role'] === 'admin') {
        // Admin: all members
        $stmt = $pdo->query("
            SELECT m.id, m.name, m.role, m.club_id, c.name AS club_name
            FROM members m
            JOIN clubs c ON m.club_id = c.id
            ORDER BY c.name, m.name
        ");
        $members = $stmt->fetchAll();
        foreach ($members as &$row) {
            $row['can_edit'] = true;
            $row['can_delete'] = true;
        }

    } elseif ($user['role'] === 'staff') {
        // Staff: only their assigned clubs
        $stmt = $pdo->prepare("
            SELECT m.id, m.name, m.role, m.club_id, c.name AS club_name
            FROM members m
            JOIN clubs c ON m.club_id = c.id
            JOIN account_clubs ac ON ac.club_id = c.id
            WHERE ac.account_id = ?
            ORDER BY c.name, m.name
        ");
        $stmt->execute([$user['id']]);
        $members = $stmt->fetchAll();
        foreach ($members as &$row) {
            $row['can_edit'] = true;
            $row['can_delete'] = true;
        }

    } else {
        // Members/users: view-only, clubs they belong to
        $stmt = $pdo->prepare("
            SELECT m.id, m.name, m.role, m.club_id, c.name AS club_name
            FROM members m
            JOIN clubs c ON m.club_id = c.id
            WHERE m.club_id IN (
                SELECT ac.club_id FROM account_clubs ac WHERE ac.account_id = ?
            )
            ORDER BY c.name, m.name
        ");
        $stmt->execute([$user['id']]);
        $members = $stmt->fetchAll();
        foreach ($members as &$row) {
            $row['can_edit'] = false;
            $row['can_delete'] = false;
        }
    }

    echo json_encode(["success" => true, "members" => $members]);

} catch (Exception $e) {
    error_log("GET_MEMBERS error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Error loading members"]);
}
