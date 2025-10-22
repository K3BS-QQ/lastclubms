<?php
session_start();
require 'db.php';

header('Content-Type: application/json');

// ✅ Check if user is logged in
$user = $_SESSION['user'] ?? null;
if (!$user) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$clubId = (int)($_POST['club_id'] ?? 0);
if ($clubId <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid club ID']);
    exit;
}

// ✅ Allow only admin or linked account to upload
if ($user['role'] !== 'admin') {
    $stmt = $pdo->prepare("
        SELECT 1 
        FROM account_clubs 
        WHERE account_id = ? 
          AND club_id = ?
    ");
    $stmt->execute([$user['id'], $clubId]);
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Permission denied']);
        exit;
    }
}

// ✅ Check file presence
if (empty($_FILES['file']['name'])) {
    echo json_encode(['success' => false, 'message' => 'No file uploaded']);
    exit;
}

$file = $_FILES['file'];

// ✅ Create directory if not exists
$uploadDir = __DIR__ . "/uploads/clubs/$clubId/";
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// ✅ Sanitize filename
$originalName = basename($file['name']);
$cleanName = preg_replace("/[^A-Za-z0-9._-]/", "_", $originalName);
$fileName = time() . "_" . $cleanName;

$serverPath = $uploadDir . $fileName;
$dbPath = "clubs/$clubId/$fileName"; // relative path stored in DB

// ✅ Move file and insert into DB
if (move_uploaded_file($file['tmp_name'], $serverPath)) {
    $stmt = $pdo->prepare("
        INSERT INTO club_files (club_id, uploaded_by, file_name, file_path, uploaded_at)
        VALUES (?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $clubId,
        $user['id'],
        $originalName, // display the original name
        $dbPath
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'File uploaded successfully',
        'path' => $dbPath,
        'fileName' => $originalName
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'File upload failed']);
}
?>
