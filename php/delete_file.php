<?php
session_start();
require 'db.php';

$user = $_SESSION['user'] ?? null;
if (!$user) {
    echo json_encode(['success'=>false,'message'=>'Unauthorized']);
    exit;
}

$id = (int)($_POST['id'] ?? 0);

// Get file info
$stmt = $pdo->prepare("SELECT club_id, file_path, uploaded_by FROM club_files WHERE id=?");
$stmt->execute([$id]);
$file = $stmt->fetch();

if (!$file) {
    echo json_encode(['success'=>false,'message'=>'File not found']);
    exit;
}

// ✅ Only admin or the staff who uploaded
$allowed = $user['role'] === 'admin' || $user['id'] == $file['uploaded_by'];
if (!$allowed) {
    echo json_encode(['success'=>false,'message'=>'Permission denied']);
    exit;
}

// Build full path (adjust if your "uploads" folder is elsewhere)
$fullPath = __DIR__ . '/../uploads/' . $file['file_path'];

// Delete from disk
if (file_exists($fullPath)) {
    unlink($fullPath);
}

// Delete from DB
$stmt = $pdo->prepare("DELETE FROM club_files WHERE id=?");
$stmt->execute([$id]);

echo json_encode(['success'=>true]);
?>
