<?php
session_start();
require "db.php";

$name = $_POST['name'] ?? '';
$desc = $_POST['description'] ?? '';
$clubId = intval($_POST['club_id'] ?? 0);

$stmt = $pdo->prepare("INSERT INTO sub_clubs (club_id, name, description) VALUES (?, ?, ?)");
$ok = $stmt->execute([$clubId, $name, $desc]);

echo json_encode(["success" => $ok]);
