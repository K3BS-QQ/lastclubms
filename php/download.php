<?php
session_start();

// 🔒 Require login
if (!isset($_SESSION['user'])) {
    http_response_code(403);
    exit("Access denied");
}

if (!isset($_GET['path'])) {
    exit("No file specified");
}

// --- Decode and sanitize path
$relativePath = urldecode($_GET['path']);
$relativePath = str_replace('\\', '/', $relativePath);
$relativePath = ltrim($relativePath, '/');
if (strpos($relativePath, '..') !== false) {
    http_response_code(400);
    exit("Invalid file path");
}

// --- Base uploads folder
$baseDir = realpath(__DIR__ . "/uploads");
$fullPath = realpath($baseDir . "/" . $relativePath);

// --- Verify inside uploads
if ($fullPath === false || strpos($fullPath, $baseDir) !== 0) {
    http_response_code(400);
    exit("Invalid file path");
}
if (!file_exists($fullPath)) {
    http_response_code(404);
    exit("File not found");
}

// --- MIME type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $fullPath);
finfo_close($finfo);

$fileName = basename($fullPath);

// --- Clear any previous output
if (ob_get_length()) ob_end_clean();

// --- Default: inline for images + pdf
$disposition = "attachment";
if (preg_match('/^image\//', $mime) || $mime === "application/pdf") {
    $disposition = "inline";
}

// --- Send headers
header("Content-Type: $mime");
header("Content-Disposition: $disposition; filename=\"$fileName\"");
header("Content-Length: " . filesize($fullPath));
header("Cache-Control: public, must-revalidate, max-age=0");
header("Pragma: public");
header("Expires: 0");

// --- Send file
readfile($fullPath);
exit;
