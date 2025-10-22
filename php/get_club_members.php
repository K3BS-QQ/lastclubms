<?php
header('Content-Type: application/json');
require 'db.php';

$clubId = (int)($_GET['club_id'] ?? 0);
if (!$clubId) {
    echo json_encode(['success' => false, 'message' => 'Invalid club ID']);
    exit;
}

try {
    // ✅ Merge multiple roles per member
    $stmt = $pdo->prepare("
        SELECT 
            m.id, 
            m.name, 
            GROUP_CONCAT(m.role ORDER BY m.role SEPARATOR ', ') AS roles,
            m.status, 
            m.joined_at
        FROM members m
        WHERE m.club_id = ?
        GROUP BY m.id, m.name, m.status, m.joined_at
        ORDER BY m.name ASC
    ");
    $stmt->execute([$clubId]);
    $members = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'members' => $members]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Failed to fetch members']);
}
