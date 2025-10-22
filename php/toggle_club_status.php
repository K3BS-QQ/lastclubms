<?php
header("Content-Type: application/json");
include 'db.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!isset($data['id']) || !isset($data['status'])) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid input"
        ]);
        exit;
    }

    $id = (int)$data['id'];
    $status = $data['status'] === 'active' ? 1 : 0;

    $stmt = $pdo->prepare("UPDATE clubs SET enabled = ? WHERE id = ?");
    $stmt->execute([$status, $id]);

    echo json_encode([
        "success" => true,
        "message" => "Club status updated successfully",
        "id" => $id,
        "status" => $data['status'] // return readable status
    ]);
} catch (Exception $e) {
    error_log("toggle_club_status error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => "Error updating club status"
    ]);
}
