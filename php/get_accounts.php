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
    if ($user['role'] === 'admin') {
        // ✅ Admin: see all accounts
        $stmt = $pdo->query("
            SELECT a.id, a.username, a.role, a.created_at,
                   GROUP_CONCAT(c.id, ':', c.name SEPARATOR '|') AS clubs
            FROM accounts a
            LEFT JOIN account_clubs ac ON ac.account_id = a.id
            LEFT JOIN clubs c ON ac.club_id = c.id
            GROUP BY a.id
            ORDER BY a.id DESC
        ");
        $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    } elseif ($user['role'] === 'staff') {
        // ✅ Staff: only accounts in their assigned clubs
        $staffId = $user['id'];

        $stmt = $pdo->prepare("
            SELECT a.id, a.username, a.role, a.created_at,
                   GROUP_CONCAT(c.id, ':', c.name SEPARATOR '|') AS clubs
            FROM accounts a
            JOIN account_clubs acs ON acs.account_id = a.id
            JOIN clubs c ON acs.club_id = c.id
            WHERE acs.club_id IN (
                SELECT club_id FROM account_clubs WHERE account_id = ?
            )
            GROUP BY a.id
            ORDER BY a.id DESC
        ");
        $stmt->execute([$staffId]);
        $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    } else {
        echo json_encode(['success' => false, 'message' => 'Access denied']);
        exit;
    }

    // ✅ Convert clubs into an array
    foreach ($accounts as &$acc) {
        $acc['clubs'] = $acc['clubs']
            ? array_map(function($c) {
                [$id, $name] = explode(":", $c);
                return ["id" => $id, "name" => $name];
              }, explode("|", $acc['clubs']))
            : [];
    }

    echo json_encode(['success' => true, 'accounts' => $accounts]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Failed to load accounts']);
}
