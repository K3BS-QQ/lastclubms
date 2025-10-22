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
    // ✅ Only parent clubs (no sub-clubs) in dashboard
    $stmt = $pdo->query("SELECT * FROM clubs WHERE parent_id IS NULL ORDER BY id DESC");
    $clubs = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

        // 🚫 In dashboard, no edit rights (always false)
        $club['can_edit'] = false;
    }

    echo json_encode(['success' => true, 'clubs' => $clubs]);

} catch (Exception $e) {
    error_log("GET_CLUBS_OVERVIEW error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error loading clubs overview.']);
}
