<?php
header('Content-Type: application/json');
require 'db.php';
session_start();

$data = json_decode(file_get_contents('php://input'), true);
$id = (int)($data['id'] ?? 0);
$username = trim($data['username'] ?? '');
$role = $data['role'] ?? '';
$club_ids = $data['club_ids'] ?? []; // array of club IDs

$user = $_SESSION['user'] ?? null;
if (!$user) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

if (!$id || !$username || !$role) {
    echo json_encode(['success' => false, 'message' => 'Invalid data']);
    exit;
}

try {
    $pdo->beginTransaction();

    // =========================
    // ADMIN: full permissions
    // =========================
    if ($user['role'] === 'admin') {

        // Restrict max 2 clubs for members & staff
        if (($role === 'user' || $role === 'staff') && count($club_ids) > 2) {
            echo json_encode([
                'success' => false,
                'message' => 'Members and staff can only be assigned to a maximum of 2 clubs.'
            ]);
            exit;
        }

        // Update account info
        $stmt = $pdo->prepare("UPDATE accounts SET username = ?, role = ? WHERE id = ?");
        $stmt->execute([$username, $role, $id]);

        // Clear old clubs
        $stmt = $pdo->prepare("DELETE FROM account_clubs WHERE account_id = ?");
        $stmt->execute([$id]);

        // Insert new clubs
        if (!empty($club_ids) && is_array($club_ids)) {
            $stmt = $pdo->prepare("INSERT INTO account_clubs (account_id, club_id) VALUES (?, ?)");
            foreach ($club_ids as $clubId) {
                $stmt->execute([$id, (int)$clubId]);
            }
        }
    }

    // =========================
    // STAFF: limited permissions
    // =========================
    elseif ($user['role'] === 'staff') {
        // Staff can only edit members (users), not staff/admin
        if ($role !== 'user') {
            echo json_encode(['success' => false, 'message' => 'Staff can only manage members']);
            exit;
        }

        // Fetch staff's own clubs
        $stmt = $pdo->prepare("SELECT club_id FROM account_clubs WHERE account_id = ?");
        $stmt->execute([$user['id']]);
        $staffClubs = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (!$staffClubs) {
            echo json_encode(['success' => false, 'message' => 'You are not assigned to any clubs']);
            exit;
        }

        // Filter the clubs being assigned to only those staff belongs to
        $allowedClubs = array_intersect($club_ids, $staffClubs);

        if (empty($allowedClubs)) {
            echo json_encode(['success' => false, 'message' => 'Invalid club assignment']);
            exit;
        }

        // Update only username (role stays "user")
        $stmt = $pdo->prepare("UPDATE accounts SET username = ? WHERE id = ? AND role = 'user'");
        $stmt->execute([$username, $id]);

        // Clear old clubs
        $stmt = $pdo->prepare("DELETE FROM account_clubs WHERE account_id = ?");
        $stmt->execute([$id]);

        // Assign only to allowed clubs
        $stmt = $pdo->prepare("INSERT INTO account_clubs (account_id, club_id) VALUES (?, ?)");
        foreach ($allowedClubs as $clubId) {
            $stmt->execute([$id, (int)$clubId]);
        }
    }

    $pdo->commit();
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    $pdo->rollBack();
    error_log("UPDATE_ACCOUNT error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Failed to update account']);
}
