<?php
header('Content-Type: application/json');
require 'db.php';
session_start();

// NOTE: This file fetches ALL sub-clubs (clubs where parent_id > 0)
// It does not require a specific club ID, making it suitable for the dashboard overview.

try {
    // 1. Fetch all sub-clubs (clubs that have a parent_id set)
    $stmt = $pdo->prepare("SELECT 
        c.id, c.name, c.logo, c.description, c.enabled, c.parent_id,
        p.name AS parent_name
    FROM clubs c
    LEFT JOIN clubs p ON c.parent_id = p.id
    WHERE c.parent_id > 0 
    ORDER BY p.name ASC, c.name ASC");
    $stmt->execute();
    $subclubs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Process results (count members, set defaults, define colors)
    foreach ($subclubs as &$club) {
        // Count members in this sub-club
        $stmt2 = $pdo->prepare("SELECT COUNT(*) FROM members WHERE club_id = :cid");
        $stmt2->execute([':cid' => $club['id']]);
        $club['members'] = (int)$stmt2->fetchColumn();

        // Defaults and types
        if (empty($club['logo'])) $club['logo'] = 'img/default.png';
        if (empty($club['description'])) $club['description'] = 'Sub-club of ' . $club['parent_name'];

        $club['enabled'] = (int)$club['enabled'];
        $club['status'] = $club['enabled'] === 1 ? 'active' : 'disabled';
        
        // Mock color for dashboard card border (based on parent club ID)
        $club['parent_club_color'] = match($club['parent_id'] % 4) {
            1 => '#2f80ed',
            2 => '#9b51e0',
            3 => '#27ae60',
            default => '#e67e22',
        };
    }

    echo json_encode(['success' => true, 'subclubs' => $subclubs]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching sub-clubs for dashboard',
        'error' => $e->getMessage() // 🔍 DEBUG
    ]);
}
?>
