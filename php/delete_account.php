<?php
header('Content-Type: application/json');
require 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$id = (int)($data['id'] ?? 0);
if(!$id){ 
    echo json_encode(['success'=>false,'message'=>'Invalid account']); 
    exit; 
}

try {
    $stmt = $pdo->prepare("DELETE FROM accounts WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success'=>true]);
} catch(Exception $e){
    echo json_encode(['success'=>false,'message'=>'Failed to delete account: '.$e->getMessage()]);
}
?>
