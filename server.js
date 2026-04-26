/**
 * CB Studio's - Minecraft Replay Cloud
 * Backend API + Static Frontend Server
 *
 * Endpoints:
 *  - POST /api/upload          -> recebe replay JSON do addon, retorna KEY
 *  - GET  /api/status/:key     -> verifica se a key existe
 *  - GET  /api/download/:key   -> download do replay
 *  - GET  /api/view/:key       -> visualiza o JSON no navegador
 *  - GET  /api/list            -> lista (admin)
 *  - GET  /admin               -> painel admin simples
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs-extra');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

// ===== Config =====
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'cbstudios_admin_change_me';
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '25', 10);
const STORAGE_DIR = path.join(__dirname, 'storage');
const PUBLIC_DIR = path.join(__dirname, 'public');

// CORS: permite qualquer origem por padrão (necessário pro addon do Minecraft).
// Se ALLOWED_ORIGINS estiver setado (ex: "https://cbstudio.infinityfree.me"), restringe.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Garante o diretório de storage
fs.ensureDirSync(STORAGE_DIR);

// ===== App =====
const app = express();
app.set('trust proxy', 1);

// Segurança e infra
app.use(
  helmet({
    contentSecurityPolicy: false, // o frontend usa estilos inline e fontes do Google
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : true,
    credentials: false,
  })
);
app.use(compression());
app.use(express.json({ limit: `${MAX_UPLOAD_MB}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${MAX_UPLOAD_MB}mb` }));

// Rate limit para a API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas requisições. Tente novamente em instantes.' },
});
app.use('/api/', apiLimiter);

// ===== Helpers =====

/**
 * Gera uma key no formato CBXX-XXXX (alfanumérico maiúsculo).
 */
function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I para evitar confusão
  const pick = (n) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CB${pick(2)}-${pick(4)}`;
}

/**
 * Valida o formato da key e previne path traversal.
 */
function isValidKey(key) {
  if (typeof key !== 'string') return false;
  return /^CB[A-Z0-9]{2}-[A-Z0-9]{4}$/.test(key);
}

/**
 * Resolve o caminho do arquivo da key, garantindo que está dentro de STORAGE_DIR.
 */
function safeKeyPath(key) {
  if (!isValidKey(key)) return null;
  const filePath = path.join(STORAGE_DIR, `${key}.json`);
  if (!filePath.startsWith(STORAGE_DIR + path.sep)) return null;
  return filePath;
}

/**
 * Sanitiza strings simples (player, replayName, mode).
 */
function sanitizeStr(value, maxLen = 64) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, maxLen);
}

/**
 * Valida o payload do replay enviado pelo addon.
 */
function validateReplayPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Payload inválido.' };
  }

  const player = sanitizeStr(body.player, 32);
  const replayName = sanitizeStr(body.replayName, 64);
  const mode = sanitizeStr(body.mode, 32);

  if (!player) return { ok: false, error: 'Campo "player" obrigatório.' };
  if (!replayName) return { ok: false, error: 'Campo "replayName" obrigatório.' };
  if (!Array.isArray(body.frames)) {
    return { ok: false, error: 'Campo "frames" deve ser um array.' };
  }
  if (body.frames.length === 0) {
    return { ok: false, error: 'O replay precisa ter pelo menos 1 frame.' };
  }

  const settings = body.settings && typeof body.settings === 'object' ? body.settings : {};

  return {
    ok: true,
    data: {
      player,
      replayName,
      mode: mode || 'default',
      frames: body.frames,
      settings: {
        weather: sanitizeStr(settings.weather, 16) || 'clear',
        time: sanitizeStr(settings.time, 16) || 'day',
        fov: typeof settings.fov === 'number' ? settings.fov : 70,
      },
    },
  };
}

/**
 * Gera uma key única (que ainda não existe no storage).
 */
async function generateUniqueKey() {
  for (let i = 0; i < 25; i++) {
    const key = generateKey();
    const file = path.join(STORAGE_DIR, `${key}.json`);
    if (!(await fs.pathExists(file))) return key;
  }
  // fallback praticamente impossível
  return `CB${uuidv4().slice(0, 2).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`;
}

// ===== Rotas API =====

/**
 * POST /api/upload
 * Recebe o replay do addon e retorna a key.
 */
app.post('/api/upload', async (req, res) => {
  try {
    const validation = validateReplayPayload(req.body);
    if (!validation.ok) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const key = await generateUniqueKey();
    const filePath = safeKeyPath(key);
    if (!filePath) {
      return res.status(500).json({ success: false, error: 'Falha ao gerar key.' });
    }

    const record = {
      key,
      uploadedAt: new Date().toISOString(),
      ...validation.data,
    };

    await fs.writeJson(filePath, record, { spaces: 2 });

    return res.json({ success: true, key });
  } catch (err) {
    console.error('[upload] erro:', err);
    return res.status(500).json({ success: false, error: 'Erro interno ao salvar replay.' });
  }
});

/**
 * GET /api/status/:key
 * Retorna { exists: true|false }.
 */
app.get('/api/status/:key', async (req, res) => {
  const key = (req.params.key || '').toUpperCase();
  if (!isValidKey(key)) return res.json({ exists: false });

  const filePath = safeKeyPath(key);
  if (!filePath) return res.json({ exists: false });

  const exists = await fs.pathExists(filePath);
  return res.json({ exists });
});

/**
 * GET /api/download/:key
 * Faz o download do JSON do replay.
 */
app.get('/api/download/:key', async (req, res) => {
  const key = (req.params.key || '').toUpperCase();
  const filePath = safeKeyPath(key);
  if (!filePath || !(await fs.pathExists(filePath))) {
    return res.status(404).json({ success: false, error: 'Replay não encontrado.' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${key}.json"`);
  return res.sendFile(filePath);
});

/**
 * GET /api/view/:key
 * Mostra o JSON no navegador.
 */
app.get('/api/view/:key', async (req, res) => {
  const key = (req.params.key || '').toUpperCase();
  const filePath = safeKeyPath(key);
  if (!filePath || !(await fs.pathExists(filePath))) {
    return res.status(404).json({ success: false, error: 'Replay não encontrado.' });
  }

  const data = await fs.readJson(filePath);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.send(JSON.stringify(data, null, 2));
});

/**
 * Middleware admin (token via header ou query).
 */
function adminAuth(req, res, next) {
  const token =
    req.get('x-admin-token') || req.query.token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ success: false, error: 'Não autorizado.' });
  }
  next();
}

/**
 * GET /api/list
 * Lista todos os replays salvos. Requer token admin.
 */
app.get('/api/list', adminAuth, async (req, res) => {
  try {
    const files = (await fs.readdir(STORAGE_DIR)).filter((f) => f.endsWith('.json'));
    const items = [];
    let totalBytes = 0;

    for (const file of files) {
      const full = path.join(STORAGE_DIR, file);
      const stat = await fs.stat(full);
      totalBytes += stat.size;
      const key = file.replace(/\.json$/, '');
      let meta = {};
      try {
        const data = await fs.readJson(full);
        meta = {
          player: data.player,
          replayName: data.replayName,
          mode: data.mode,
          uploadedAt: data.uploadedAt,
          frames: Array.isArray(data.frames) ? data.frames.length : 0,
        };
      } catch (_) {
        // ignora arquivo corrompido
      }
      items.push({
        key,
        size: stat.size,
        ...meta,
      });
    }

    items.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));

    return res.json({
      success: true,
      total: items.length,
      totalBytes,
      totalSize: formatBytes(totalBytes),
      items,
    });
  } catch (err) {
    console.error('[list] erro:', err);
    return res.status(500).json({ success: false, error: 'Erro ao listar arquivos.' });
  }
});

/**
 * Util: formata bytes em string humana.
 */
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[i]}`;
}

// ===== Página Admin =====
app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

// ===== Frontend estático =====
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

// SPA fallback (qualquer rota não-API cai no index)
app.get(/^\/(?!api\/).*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ===== Tratamento de erro genérico =====
app.use((err, req, res, _next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: `Arquivo maior que ${MAX_UPLOAD_MB}MB.` });
  }
  console.error('[error]', err);
  res.status(500).json({ success: false, error: 'Erro interno do servidor.' });
});

// ===== Start =====
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CB Studio's] API rodando em http://0.0.0.0:${PORT}`);
});
