<?php
/**
 * CB Studio's - Helpers compartilhados (versão PHP)
 */

// Caminho seguro do storage (fora da raiz pública seria ideal, mas no InfinityFree fica em /htdocs/storage e é protegido por .htaccess)
define('CB_STORAGE_DIR', __DIR__ . '/storage');
define('CB_ADMIN_TOKEN', 'cbstudios_admin_change_me'); // ALTERE depois

// Garante que o diretório existe
if (!is_dir(CB_STORAGE_DIR)) {
  @mkdir(CB_STORAGE_DIR, 0755, true);
}

// Headers padrão para qualquer endpoint API
function cb_api_headers() {
  header('Content-Type: application/json; charset=utf-8');
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, x-admin-token');
  header('X-Content-Type-Options: nosniff');
}

// Resposta JSON e fim
function cb_json($data, $status = 200) {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

// Valida formato de KEY: CBXX-XXXX (alfanumérico maiúsculo)
function cb_is_valid_key($key) {
  if (!is_string($key)) return false;
  return (bool) preg_match('/^CB[A-Z0-9]{2}-[A-Z0-9]{4}$/', $key);
}

// Caminho seguro do arquivo da key (impede path traversal)
function cb_key_path($key) {
  if (!cb_is_valid_key($key)) return null;
  $path = CB_STORAGE_DIR . DIRECTORY_SEPARATOR . $key . '.json';
  $real = realpath(CB_STORAGE_DIR);
  if (!$real) return null;
  // Verifica que está dentro do storage
  $dirname = dirname($path);
  if (realpath($dirname) !== $real) return null;
  return $path;
}

// Sanitiza string simples (sem control chars, sem < > )
function cb_sanitize_str($v, $max = 64) {
  if (!is_string($v)) return '';
  $v = preg_replace('/[\x00-\x1F\x7F<>]/', '', $v);
  $v = trim($v);
  if (mb_strlen($v) > $max) $v = mb_substr($v, 0, $max);
  return $v;
}

// Gera key no formato CBXX-XXXX (sem 0/O/1/I para evitar confusão)
function cb_generate_key() {
  $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  $len = strlen($chars);
  $pick = function ($n) use ($chars, $len) {
    $out = '';
    for ($i = 0; $i < $n; $i++) {
      $out .= $chars[random_int(0, $len - 1)];
    }
    return $out;
  };
  return 'CB' . $pick(2) . '-' . $pick(4);
}

// Gera key única (que ainda não existe no storage)
function cb_generate_unique_key() {
  for ($i = 0; $i < 25; $i++) {
    $key = cb_generate_key();
    $path = CB_STORAGE_DIR . DIRECTORY_SEPARATOR . $key . '.json';
    if (!file_exists($path)) return $key;
  }
  // fallback
  return 'CB' . substr(strtoupper(bin2hex(random_bytes(1))), 0, 2) . '-' . substr(strtoupper(bin2hex(random_bytes(2))), 0, 4);
}

// Auth admin (header x-admin-token, query ?token=, ou Authorization Bearer)
function cb_check_admin() {
  $token = '';
  if (!empty($_SERVER['HTTP_X_ADMIN_TOKEN'])) $token = $_SERVER['HTTP_X_ADMIN_TOKEN'];
  elseif (!empty($_GET['token'])) $token = $_GET['token'];
  elseif (!empty($_SERVER['HTTP_AUTHORIZATION'])) $token = trim(str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']));
  if (!$token || !hash_equals(CB_ADMIN_TOKEN, $token)) {
    cb_json(['success' => false, 'error' => 'Não autorizado.'], 401);
  }
}

// Formata bytes humano
function cb_format_bytes($bytes) {
  if (!$bytes) return '0 B';
  $units = ['B', 'KB', 'MB', 'GB'];
  $i = 0;
  $v = (float)$bytes;
  while ($v >= 1024 && $i < count($units) - 1) { $v /= 1024; $i++; }
  return number_format($v, $v < 10 ? 2 : 1) . ' ' . $units[$i];
}

// CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  cb_api_headers();
  http_response_code(204);
  exit;
}
