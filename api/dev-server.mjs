/**
 * Local static + Poe proxy server (no npm install required).
 *
 * - Serves the project root at http://localhost:3457
 * - POST /api/poe  → https://api.poe.com/v1/chat/completions
 *   Forwards the browser Authorization: Bearer <poe-key>
 *
 * Gemini browserKey mode still calls Google directly (unchanged).
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3457);
const POE_UPSTREAM = 'https://api.poe.com/v1/chat/completions';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  const cleaned = decoded.replace(/^\/+/, '');
  const full = path.resolve(root, cleaned || 'index.html');
  if (!full.startsWith(root)) return null;
  return full;
}

async function handlePoeProxy(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    });
    return res.end();
  }

  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Method not allowed' });
  }

  const auth = req.headers.authorization || '';
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return send(res, 401, { error: 'Missing Authorization: Bearer <poe-api-key>' });
  }

  const raw = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(raw.toString('utf8') || '{}');
  } catch {
    return send(res, 400, { error: 'Invalid JSON body' });
  }

  try {
    const upstream = await fetch(POE_UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(payload),
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
    });
    res.end(text);
    console.log('[poe]', new Date().toISOString(), upstream.status);
  } catch (err) {
    console.error('[poe]', err.message);
    send(res, 502, { error: `Upstream failed: ${err.message}` });
  }
}

function serveStatic(req, res) {
  let filePath = safeJoin(ROOT, req.url === '/' ? '/index.html' : req.url);
  if (!filePath) {
    return send(res, 403, { error: 'Forbidden' });
  }

  fs.stat(filePath, (err, st) => {
    if (!err && st.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Not found');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = req.url || '/';
    if (url.startsWith('/api/poe')) {
      return await handlePoeProxy(req, res);
    }
    if (url.startsWith('/api/health')) {
      return send(res, 200, { ok: true, poeProxy: true, root: ROOT });
    }
    return serveStatic(req, res);
  } catch (err) {
    console.error(err);
    send(res, 500, { error: err.message || String(err) });
  }
});

server.listen(PORT, () => {
  console.log(`DSE MC Generator + Poe proxy`);
  console.log(`  Open  http://localhost:${PORT}/`);
  console.log(`  Poe   POST http://localhost:${PORT}/api/poe`);
  console.log(`  Gemini still uses browser key → Google (unchanged)`);
});
