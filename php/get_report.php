<?php
header('Content-Type: application/json');
require 'db.php'; // your db connection

$club_id = $_GET['club_id'] ?? '';
$role = $_GET['role'] ?? '';
$from = $_GET['from_date'] ?? '';
$to = $_GET['to_date'] ?? '';

$query = "SELECT name, role FROM members WHERE 1=1";
$params = [];

if (!empty($club_id)) {
    $query .= " AND club_id = ?";
    $params[] = $club_id;
}
if (!empty($role)) {
    $query .= " AND role = ?";
    $params[] = $role;
}
if (!empty($from) && !empty($to)) {
    $query .= " AND created_at BETWEEN ? AND ?";
    $params[] = $from;
    $params[] = $to;
}

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$members = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    "success" => true,
    "members" => $members
]);
