<?php
session_start();
header('Content-Type: application/json');
require 'db.php';

if (!isset($_SESSION['user'])) {
    echo json_encode(['loggedIn' => false]);
    exit;
}

$user = $_SESSION['user'];

// Fetch clubs for this user
$stmt = $pdo->prepare("
    SELECT c.id, c.name 
    FROM account_clubs ac
    JOIN clubs c ON ac.club_id = c.id
    WHERE ac.account_id = ?
");
$stmt->execute([$user['id']]);
$clubs = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'loggedIn' => true,
    'id' => $user['id'],
    'username' => $user['username'],
    'role' => $user['role'],
    'clubs' => $clubs
]);
?>
