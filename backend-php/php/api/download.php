<?php
require_once __DIR__ . '/../_helpers.php';

$key = strtoupper($_GET['key'] ?? '');
$path = cb_key_path($key);
if (!$path || !file_exists($path)) {
  cb_api_headers();
  cb_json(['success' => false, 'error' => 'Replay não encontrado.'], 404);
}

header('Content-Type: application/json; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $key . '.json"');
header('X-Content-Type-Options: nosniff');
header('Content-Length: ' . filesize($path));
readfile($path);
exit;
