<?php
header('Content-Type: application/json');
require 'db.php';

try {
    $stmt = $pdo->query("SELECT DISTINCT role FROM members ORDER BY role ASC");
    $roles = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode(['success' => true, 'roles' => $roles]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error loading roles']);
}
