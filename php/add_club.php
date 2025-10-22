<?php
session_start();
include 'db.php';

header("Content-Type: application/json");

// ✅ Only Admin can add a club
if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
    echo json_encode(["success" => false, "message" => "Unauthorized"]);
    exit;
}

$name = trim($_POST['name'] ?? '');
$desc = trim($_POST['description'] ?? '');
$parent_id = !empty($_POST['parent_id']) ? intval($_POST['parent_id']) : null;

if ($name === '' || $desc === '') {
    echo json_encode(["success" => false, "message" => "Missing fields"]);
    exit;
}

try {
    $logoPath = "img/default.jpg"; // default logo

    // ✅ Handle logo upload if provided
    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $fileName = basename($_FILES['file']['name']);
        $targetDir = "../img/";
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }
        $uniqueName = time() . "_" . $fileName;
        $filePath = $targetDir . $uniqueName;

        if (move_uploaded_file($_FILES['file']['tmp_name'], $filePath)) {
            $logoPath = "img/" . $uniqueName; // store relative path
        }
    }

    // ✅ Insert into clubs (parent_id can be NULL or a parent club ID)
    $stmt = $pdo->prepare("
        INSERT INTO clubs (name, description, logo, parent_id, enabled, created_at)
        VALUES (?, ?, ?, ?, 1, NOW())
    ");
    $stmt->execute([$name, $desc, $logoPath, $parent_id]);

    echo json_encode(["success" => true]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "DB error",
        "error" => $e->getMessage()
    ]);
}
