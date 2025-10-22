<?php
header('Content-Type: application/json');
require 'db.php';

try {
    // Count total members
    $stmt1 = $pdo->query("SELECT COUNT(*) AS total_members FROM members");
    $total_members = $stmt1->fetch()['total_members'];

    // Count total clubs
    $stmt2 = $pdo->query("SELECT COUNT(*) AS total_clubs FROM clubs");
    $total_clubs = $stmt2->fetch()['total_clubs'];

    echo json_encode([
        'success' => true,
        'total_members' => (int)$total_members,
        'total_clubs' => (int)$total_clubs
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error loading stats']);
}
?>
