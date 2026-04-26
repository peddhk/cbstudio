<?php
require_once __DIR__ . '/../_helpers.php';
cb_api_headers();
cb_check_admin();

$items = [];
$totalBytes = 0;

if (is_dir(CB_STORAGE_DIR)) {
  $files = scandir(CB_STORAGE_DIR) ?: [];
  foreach ($files as $f) {
    if (substr($f, -5) !== '.json') continue;
    $full = CB_STORAGE_DIR . DIRECTORY_SEPARATOR . $f;
    $size = filesize($full) ?: 0;
    $totalBytes += $size;
    $key = substr($f, 0, -5);
    $meta = ['player' => null, 'replayName' => null, 'mode' => null, 'uploadedAt' => null, 'frames' => 0];
    $raw = @file_get_contents($full);
    if ($raw) {
      $data = json_decode($raw, true);
      if (is_array($data)) {
        $meta['player']     = $data['player'] ?? null;
        $meta['replayName'] = $data['replayName'] ?? null;
        $meta['mode']       = $data['mode'] ?? null;
        $meta['uploadedAt'] = $data['uploadedAt'] ?? null;
        $meta['frames']     = isset($data['frames']) && is_array($data['frames']) ? count($data['frames']) : 0;
      }
    }
    $items[] = array_merge(['key' => $key, 'size' => $size], $meta);
  }
  // ordena por uploadedAt desc
  usort($items, function ($a, $b) {
    return strcmp((string)($b['uploadedAt'] ?? ''), (string)($a['uploadedAt'] ?? ''));
  });
}

cb_json([
  'success'    => true,
  'total'      => count($items),
  'totalBytes' => $totalBytes,
  'totalSize'  => cb_format_bytes($totalBytes),
  'items'      => $items,
]);
