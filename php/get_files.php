<?php
session_start();
require 'db.php';

header("Content-Type: application/json");

$user = $_SESSION['user'] ?? null;
if (!$user) {
    echo json_encode(['success'=>false,'message'=>'Unauthorized']);
    exit;
}

$clubId = (int)($_GET['club_id'] ?? 0);

$stmt = $pdo->prepare("
    SELECT f.id, f.file_name, f.file_path, f.uploaded_at, a.username AS uploader
    FROM club_files f
    JOIN accounts a ON f.uploaded_by = a.id
    WHERE f.club_id = ?
    ORDER BY f.uploaded_at DESC
");
$stmt->execute([$clubId]);
$files = $stmt->fetchAll();

// ✅ Attach download link for each file
foreach ($files as &$file) {
    // only pass relative DB path like "clubs/24/filename.docx"
    $file['download_url'] = "php/download.php?path=" . urlencode($file['file_path']);
}

echo json_encode(['success'=>true,'files'=>$files]);
