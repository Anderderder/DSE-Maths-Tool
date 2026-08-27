/**
 * Gemini Enterprise / Vertex proxy stub.
 *
 * Phase 1: frontend uses browser API keys (mode: browserKey).
 * Phase 2: set window.DSE_MC_GEMINI_MODE = 'proxy' and deploy this
 * (or equivalent Cloud Function) so the browser never sees the key.
 *
 * Expected POST /api/generate body (same shape as Gemini generateContent
 * plus optional model):
 * {
 *   model?: string,
 *   systemInstruction?: { parts: [{ text }] },
 *   contents: [...],
 *   generationConfig: { temperature, responseMimeType, responseSchema }
 * }
 *
 * Response: either raw Gemini JSON, or { result: <parsed MC object> }.
 *
 * This file is a Node/Express reference — not started by `npx serve`.
 * Deploy separately when you have Gemini Enterprise credentials.
 */

/* eslint-disable no-console */

const express = require('express');

const PORT = process.env.PORT || 8787;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

async function forwardToGemini(payload) {
  if (!GEMINI_API_KEY) {
    const err = new Error('Server missing GEMINI_API_KEY / GOOGLE_API_KEY');
    err.status = 500;
    throw err;
  }

  const model = payload.model || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const { model: _drop, ...geminiBody } = payload;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify(geminiBody),
  });

  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`Upstream ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    throw err;
  }
  return JSON.parse(text);
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      mode: 'proxy-stub',
      hasKey: Boolean(GEMINI_API_KEY),
      model: DEFAULT_MODEL,
    });
  });

  app.post('/api/generate', async (req, res) => {
    try {
      const data = await forwardToGemini(req.body || {});
      // Optional: light usage log (no PII)
      console.log('[generate]', new Date().toISOString(), 'ok');
      res.json(data);
    } catch (err) {
      console.error('[generate]', err.message);
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  return app;
}

if (require.main === module) {
  createApp().listen(PORT, () => {
    console.log(`DSE MC Gemini proxy stub on http://localhost:${PORT}`);
    console.log('Set GEMINI_API_KEY and point the app with:');
    console.log('  window.DSE_MC_GEMINI_MODE = "proxy"');
    console.log(`  window.GEMINI_PROXY_URL = "http://localhost:${PORT}/api/generate"`);
  });
}

module.exports = { createApp, forwardToGemini };
