<?php 
header('Content-Type: application/json');
require 'db.php';
session_start();

$user = $_SESSION['user'] ?? null;

if (!$user) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

try {
    // ✅ Everyone sees all clubs
    $stmt = $pdo->query("SELECT * FROM clubs ORDER BY id DESC");
    $clubs = $stmt->fetchAll();

    foreach ($clubs as &$club) {
        // Count members
        $stmt2 = $pdo->prepare("SELECT COUNT(*) FROM members WHERE club_id = ?");
        $stmt2->execute([$club['id']]);
        $club['members'] = (int)$stmt2->fetchColumn();

        // Defaults
        if (!$club['logo']) $club['logo'] = 'img/syntax.jpeg';
        if (!$club['description']) $club['description'] = '';

        // ✅ Return both numeric and readable
        $club['enabled'] = (int)$club['enabled'];
        $club['status'] = $club['enabled'] === 1 ? 'active' : 'disabled';

        // 🔒 Permissions: only admin/staff can edit, members are always read-only
        if ($user['role'] === 'admin' || $user['role'] === 'staff') {
            $club['can_edit'] = true;
        } else {
            $club['can_edit'] = false;
        }
    }

    echo json_encode(['success' => true, 'clubs' => $clubs]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error loading dashboard clubs.']);
}
