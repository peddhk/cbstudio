<?php
require_once __DIR__ . '/../_helpers.php';
cb_api_headers();

$key = strtoupper($_GET['key'] ?? '');
if (!cb_is_valid_key($key)) {
  cb_json(['exists' => false]);
}
$path = cb_key_path($key);
cb_json(['exists' => $path && file_exists($path)]);
