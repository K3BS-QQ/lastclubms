<?php
header('Content-Type: application/json');
require 'db.php'; // Database connection
session_start();

// Ensure the request is POST and JSON
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_SESSION['user_id'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized access.']);
    exit;
}

// Check for required input
$input = json_decode(file_get_contents('php://input'), true);

$clubId = $input['club_id'] ?? null;
$memberName = trim($input['member_name'] ?? '');
$role = trim($input['role'] ?? 'Member');

if (!$clubId || empty($memberName)) {
    echo json_encode(['success' => false, 'message' => 'Club ID and Member Name are required.']);
    exit;
}

try {
    // 1. Check if the member already exists in this specific club/sub-club
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM members WHERE club_id = :clubId AND name = :name");
    $stmt->execute([':clubId' => $clubId, ':name' => $memberName]);
    if ($stmt->fetchColumn() > 0) {
        echo json_encode(['success' => false, 'message' => 'Member is already registered in this club.']);
        exit;
    }

    // 2. Enforce the Two-Club Limit (CRITICAL BUSINESS LOGIC)
    $stmt = $pdo->prepare("
        SELECT COUNT(DISTINCT club_id) 
        FROM members 
        WHERE name = :name
    ");
    $stmt->execute([':name' => $memberName]);
    $currentClubCount = $stmt->fetchColumn();

    if ($currentClubCount >= 2) {
        echo json_encode(['success' => false, 'message' => "Failed: {$memberName} is already a member of 2 clubs and cannot join another."]);
        exit;
    }

    // 3. Add the member to the club
    $stmt = $pdo->prepare("
        INSERT INTO members (club_id, name, role, status, joined_at) 
        VALUES (:clubId, :name, :role, 'active', NOW())
    ");
    $stmt->execute([
        ':clubId' => $clubId,
        ':name' => $memberName,
        ':role' => $role
    ]);

    // Update club member count cache (optional, based on your database design)
    // You might need an additional query here to update the member count in the 'clubs' table.

    echo json_encode(['success' => true, 'message' => 'Member added successfully.']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
