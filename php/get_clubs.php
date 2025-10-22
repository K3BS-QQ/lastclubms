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
    $clubs = [];

    if (isset($_GET['parent_id'])) {
        // ✅ Fetch sub-clubs for a parent
        $parentId = intval($_GET['parent_id']);
        $stmt = $pdo->prepare("
    SELECT * 
    FROM clubs 
    WHERE parent_id = ? 
    ORDER BY id DESC
");
$stmt->execute([$parentId]);

    } else {
        // ✅ Fetch parent clubs (no parent_id)
        if ($user['role'] === 'admin') {
            $stmt = $pdo->query("
                SELECT * 
                FROM clubs 
                WHERE parent_id IS NULL 
                ORDER BY id DESC
            ");

        } elseif ($user['role'] === 'staff') {
            $stmt = $pdo->prepare("
                SELECT c.* 
                FROM clubs c
                JOIN account_clubs ac ON ac.club_id = c.id
                WHERE ac.account_id = ? 
                  AND c.parent_id IS NULL
                ORDER BY c.id DESC
            ");
            $stmt->execute([$user['id']]);

        } elseif ($user['role'] === 'member') {
            $stmt = $pdo->query("
                SELECT * 
                FROM clubs 
                WHERE enabled = 1 
                  AND parent_id IS NULL 
                ORDER BY id DESC
            ");

        } else {
            echo json_encode(['success' => false, 'message' => 'Permission denied']);
            exit;
        }
    }

    $clubs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ✅ Enrich each club
    foreach ($clubs as &$club) {
        // Count members
        $stmt2 = $pdo->prepare("SELECT COUNT(*) FROM members WHERE club_id = ?");
        $stmt2->execute([$club['id']]);
        $club['members'] = (int)$stmt2->fetchColumn();

        // Defaults
        if (!$club['logo']) $club['logo'] = 'img/syntax.jpeg';
        if (!$club['description']) $club['description'] = '';

        $club['enabled'] = (int)$club['enabled'];
        $club['status'] = $club['enabled'] === 1 ? 'active' : 'disabled';

        // Permissions
        $club['can_edit'] = false;
        if ($user['role'] === 'admin') {
            $club['can_edit'] = true;
        } elseif ($user['role'] === 'staff') {
            $stmt3 = $pdo->prepare("
                SELECT 1 
                FROM account_clubs 
                WHERE account_id = ? AND club_id = ?
            ");
            $stmt3->execute([$user['id'], $club['id']]);
            $club['can_edit'] = $stmt3->fetchColumn() ? true : false;
        }
    }

    echo json_encode([
        'success' => true,
        'clubs' => $clubs
    ]);

} catch (Exception $e) {
    error_log("GET_CLUBS error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error loading clubs.']);
}
