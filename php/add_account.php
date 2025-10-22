<?php
header("Content-Type: application/json");
require_once "db.php";
session_start();

// Read JSON input
$input = json_decode(file_get_contents("php://input"), true);

// Validate
if (!$input || empty($input['username']) || empty($input['password'])) {
    echo json_encode([ "success" => false, "message" => "Missing username or password" ]);
    exit;
}

$username = $input['username'];
$password = $input['password'];
$role = $input['role'] ?? 'member';
$club_ids = $input['club_ids'] ?? [];

// Get logged-in user
$currentUser = $_SESSION['user'] ?? null;
if (!$currentUser) {
    echo json_encode([ "success" => false, "message" => "Not logged in" ]);
    exit;
}

// ✅ Limit clubs for staff and members
if (($role === 'staff' || $role === 'user') && count($club_ids) > 2) {
    echo json_encode([ "success" => false, "message" => "Staff and Members can only be assigned to a maximum of 2 clubs." ]);
    exit;
}

// ✅ Staff-specific restriction
if ($currentUser['role'] === 'staff') {
    if ($role !== 'user') {
        echo json_encode([ "success" => false, "message" => "Staff can only create user accounts." ]);
        exit;
    }

    // Fetch staff's allowed clubs
    $stmt = $pdo->prepare("SELECT club_id FROM account_clubs WHERE account_id = ?");
    $stmt->execute([$currentUser['id']]);
    $allowedClubs = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Filter input clubs
    $club_ids = array_intersect($club_ids, $allowedClubs);

    if (empty($club_ids)) {
        echo json_encode([ "success" => false, "message" => "You can only add members to your assigned clubs." ]);
        exit;
    }
}

try {
    // Insert account
    $stmt = $pdo->prepare("INSERT INTO accounts (username, password, role) VALUES (?, ?, ?)");
    $stmt->execute([
        $username,
        password_hash($password, PASSWORD_DEFAULT),
        $role
    ]);
    $newId = $pdo->lastInsertId();

    // Insert clubs (if any selected)
    if (!empty($club_ids)) {
        $stmtClub = $pdo->prepare("INSERT INTO account_clubs (account_id, club_id) VALUES (?, ?)");
        foreach ($club_ids as $clubId) {
            $stmtClub->execute([$newId, $clubId]);
        }
    }

    echo json_encode([ "success" => true, "message" => "Account created successfully" ]);
} catch (Exception $e) {
    echo json_encode([ "success" => false, "message" => $e->getMessage() ]);
}
