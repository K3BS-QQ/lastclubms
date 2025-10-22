<?php
require 'db.php';
require __DIR__ . '/../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

// Connect (you can reuse $pdo from db.php if you prefer)
$conn = new mysqli("localhost", "root", "", "club_management");

// ✅ Read filters from GET
$club_id   = $_GET['club_id']   ?? '';
$status    = $_GET['status']    ?? '';
$role      = $_GET['role']      ?? '';
$from_date = $_GET['from_date'] ?? '';
$to_date   = $_GET['to_date']   ?? '';

// ✅ Build base query
$sql = "
    SELECT m.name, m.role, c.name AS club, m.joined_at, m.status
    FROM members m
    JOIN clubs c ON m.club_id = c.id
    WHERE 1=1
";

// ✅ Add filters if present
if ($club_id !== '') {
    $sql .= " AND m.club_id = " . (int)$club_id;
}
if ($status !== '') {
    $sql .= " AND m.status = '" . $conn->real_escape_string($status) . "'";
}
if ($role !== '') {
    $sql .= " AND m.role = '" . $conn->real_escape_string($role) . "'";
}
if ($from_date !== '' && $to_date !== '') {
    $sql .= " AND DATE(m.joined_at) BETWEEN '" . $conn->real_escape_string($from_date) . "' 
                                       AND '" . $conn->real_escape_string($to_date) . "'";
}

// ✅ Run query
$query = $conn->query($sql);

// ✅ Spreadsheet
$spreadsheet = new Spreadsheet();
$sheet = $spreadsheet->getActiveSheet();

// ✅ Header row
$sheet->setCellValue('A1', 'Name');
$sheet->setCellValue('B1', 'Role');
$sheet->setCellValue('C1', 'Club');
$sheet->setCellValue('D1', 'Joined At');
$sheet->setCellValue('E1', 'Status');

// ✅ Bold header
$sheet->getStyle('A1:E1')->getFont()->setBold(true);

// ✅ Fill data
$row = 2;
while ($data = $query->fetch_assoc()) {
    $sheet->setCellValue('A'.$row, $data['name']);
    $sheet->setCellValue('B'.$row, $data['role']);
    $sheet->setCellValue('C'.$row, $data['club']);
    $sheet->setCellValue('D'.$row, $data['joined_at']);
    $sheet->setCellValue('E'.$row, $data['status']);
    $row++;
}

// ✅ Auto-size columns
foreach (range('A','E') as $col) {
    $sheet->getColumnDimension($col)->setAutoSize(true);
}

// ✅ AutoFilter for all rows/columns
$highestRow = $sheet->getHighestRow();
$highestColumn = $sheet->getHighestColumn();
$sheet->setAutoFilter("A1:{$highestColumn}{$highestRow}");

// ✅ Output
$writer = new Xlsx($spreadsheet);
$filename = "club_members_" . date('Y-m-d_H-i-s') . ".xlsx";
header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header('Content-Disposition: attachment; filename="'.$filename.'"');
$writer->save("php://output");
exit;
