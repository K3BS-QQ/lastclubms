<?php
header("Content-Type: application/json");
include 'db.php';

// Read JSON input
$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'] ?? null;
$status = $data['status'] ?? null;

if (!$id || !in_array($status, ['active', 'disabled'])) {
    echo json_encode(["success" => false, "message" => "Invalid input"]);
    exit;
}

try {
    // Convert status string → enabled int
    $enabled = ($status === 'active') ? 1 : 0;

    $stmt = $pdo->prepare("UPDATE clubs SET enabled = ? WHERE id = ?");
    $stmt->execute([$enabled, $id]);

    echo json_encode(["success" => true]);
} catch (Exception $e) {
    error_log("update_club_status error: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Update failed"]);
}
?>
