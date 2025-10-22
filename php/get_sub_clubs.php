<?php
header('Content-Type: application/json');
require 'db.php';
session_start();

$parent_id = isset($_GET['parent_id']) ? (int)$_GET['parent_id'] : 0;

if ($parent_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid parent ID']);
    exit;
}

try {
    // ✅ Fetch sub-clubs using parent_id
    $stmt = $pdo->prepare("SELECT * FROM clubs WHERE parent_id = :pid ORDER BY id ASC");
    $stmt->execute([':pid' => $parent_id]);
    $subclubs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($subclubs as &$club) {
        // ✅ Count members in this sub-club
        $stmt2 = $pdo->prepare("SELECT COUNT(*) FROM members WHERE club_id = :cid");
        $stmt2->execute([':cid' => $club['id']]);
        $club['members'] = (int)$stmt2->fetchColumn();

        // ✅ Defaults
        if (empty($club['logo'])) $club['logo'] = 'img/syntax.jpeg';
        if (empty($club['description'])) $club['description'] = '';

        $club['enabled'] = (int)$club['enabled'];
        $club['status'] = $club['enabled'] === 1 ? 'active' : 'disabled';
    }

    echo json_encode(['success' => true, 'subclubs' => $subclubs]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching sub-clubs',
        'error' => $e->getMessage() // 🔍 DEBUG
    ]);
}
?>
