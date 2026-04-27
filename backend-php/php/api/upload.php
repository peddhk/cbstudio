<?php
require_once __DIR__ . '/../_helpers.php';
cb_api_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  cb_json(['success' => false, 'error' => 'Método não permitido. Use POST.'], 405);
}

// Lê o body JSON
$raw = file_get_contents('php://input');
if (!$raw) {
  cb_json(['success' => false, 'error' => 'Body vazio.'], 400);
}

$body = json_decode($raw, true);
if (!is_array($body)) {
  cb_json(['success' => false, 'error' => 'JSON inválido.'], 400);
}

$player     = cb_sanitize_str($body['player'] ?? '', 32);
$replayName = cb_sanitize_str($body['replayName'] ?? '', 64);
$mode       = cb_sanitize_str($body['mode'] ?? '', 32);

if ($player === '')     cb_json(['success' => false, 'error' => 'Campo "player" obrigatório.'], 400);
if ($replayName === '') cb_json(['success' => false, 'error' => 'Campo "replayName" obrigatório.'], 400);

$frames = $body['frames'] ?? null;
if (!is_array($frames))     cb_json(['success' => false, 'error' => 'Campo "frames" deve ser um array.'], 400);
if (count($frames) === 0)   cb_json(['success' => false, 'error' => 'O replay precisa ter pelo menos 1 frame.'], 400);

$settings = (isset($body['settings']) && is_array($body['settings'])) ? $body['settings'] : [];

$record = [
  'key'         => null,
  'uploadedAt'  => gmdate('Y-m-d\TH:i:s\Z'),
  'player'      => $player,
  'replayName'  => $replayName,
  'mode'        => $mode !== '' ? $mode : 'default',
  'frames'      => $frames,
  'settings'    => [
    'weather' => cb_sanitize_str($settings['weather'] ?? '', 16) ?: 'clear',
    'time'    => cb_sanitize_str($settings['time'] ?? '', 16) ?: 'day',
    'fov'     => is_numeric($settings['fov'] ?? null) ? (float)$settings['fov'] : 70,
  ],
];

$key = cb_generate_unique_key();
$path = cb_key_path($key);
if (!$path) {
  cb_json(['success' => false, 'error' => 'Falha ao gerar key.'], 500);
}
$record['key'] = $key;

$ok = @file_put_contents($path, json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
if ($ok === false) {
  cb_json(['success' => false, 'error' => 'Falha ao salvar replay.'], 500);
}

cb_json(['success' => true, 'key' => $key]);
