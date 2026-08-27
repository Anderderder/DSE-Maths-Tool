/**
 * Poe client — OpenAI-compatible Chat Completions via api.poe.com.
 *
 * Browser calls usually need a same-origin proxy (CORS). Prefer:
 *   window.POE_PROXY_URL  (default: same origin /api/poe when using start.bat)
 * Direct browser → api.poe.com is tried only when POE_DIRECT=true.
 *
 * Gemini code is untouched; this is a parallel provider.
 */

import { parseJsonResponse } from './gemini.js';

export const POE_MODEL = 'Gemini-2.5-Flash';

export const POE_MODEL_FALLBACKS = [
  'Gemini-2.5-Flash',
  'GPT-4o-Mini',
  'Claude-Sonnet-4',
];

const REQUEST_TIMEOUT_MS = 45000;
const MAX_MODELS_TO_TRY = 3;

function buildModelQueue(preferredModel) {
  const queue = [preferredModel];
  for (const m of POE_MODEL_FALLBACKS) {
    if (!queue.includes(m)) queue.push(m);
  }
  return queue.slice(0, MAX_MODELS_TO_TRY);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getPoeApiKey() {
  return (
    (typeof window !== 'undefined' &&
      (window.__APP_POE_KEY__ ||
        window.POE_API_KEY ||
        window.__POE_API_KEY__ ||
        (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('poe_api_key') : ''))) ||
    ''
  );
}

export function getPoeProxyUrl() {
  if (typeof window === 'undefined') return '/api/poe';
  if (window.POE_PROXY_URL) return window.POE_PROXY_URL;
  // Same-origin proxy when served by api/dev-server.mjs
  return `${window.location.origin}/api/poe`;
}

function schemaInstruction(schema) {
  if (!schema) {
    return '\n\nRespond with a single valid JSON object only. No markdown fences.';
  }
  return (
    '\n\nRespond with a single valid JSON object only (no markdown fences) matching this schema:\n' +
    JSON.stringify(schema, null, 2)
  );
}

/**
 * @param {{ model?: string }} [config]
 */
export function createPoeClient(config = {}) {
  const preferredModel =
    config.model ||
    (typeof window !== 'undefined' && window.POE_MODEL) ||
    POE_MODEL;

  async function generateContent({ systemPrompt, userText, schema, temperature = 0.85, onProgress }) {
    const key = getPoeApiKey();
    if (!key) {
      throw new Error(
        'Poe API key required. Open Settings and paste your Poe key, or run: window.POE_API_KEY = "your-key"',
      );
    }

    const messages = [
      {
        role: 'system',
        content: String(systemPrompt || '') + schemaInstruction(schema),
      },
      {
        role: 'user',
        content: String(userText || ''),
      },
    ];

    const models = buildModelQueue(preferredModel);
    const progress = typeof onProgress === 'function' ? onProgress : () => {};
    let lastError;

    for (let mi = 0; mi < models.length; mi++) {
      const model = models[mi];
      try {
        progress(
          mi === 0
            ? `Calling Poe (${model})…`
            : `Busy — switching to Poe ${model} (${mi + 1}/${models.length})…`,
        );
        const text = await callPoeChat({
          key,
          model,
          messages,
          temperature,
        });
        return parseJsonResponse(text);
      } catch (err) {
        lastError = err;
        const msg = err && err.message ? err.message : String(err);
        const status = err && err.status;
        const switchModel =
          status === 503 ||
          status === 429 ||
          status === 404 ||
          /503|429|not found|Timed out|high demand/i.test(msg);
        if (switchModel && mi < models.length - 1) {
          await sleep(400);
          continue;
        }
        if (mi < models.length - 1) {
          await sleep(400);
          continue;
        }
      }
    }

    throw lastError || new Error('Poe request failed');
  }

  return {
    mode: 'poe',
    provider: 'poe',
    model: preferredModel,
    generateContent,
  };
}

async function callPoeChat({ key, model, messages, temperature }) {
  const useDirect =
    typeof window !== 'undefined' &&
    (window.POE_DIRECT === true || window.POE_DIRECT === 'true');

  if (useDirect) {
    return postChatCompletions('https://api.poe.com/v1/chat/completions', key, {
      model,
      messages,
      temperature,
    });
  }

  // Prefer same-origin / configured proxy (avoids CORS)
  try {
    return await postChatCompletions(getPoeProxyUrl(), key, {
      model,
      messages,
      temperature,
    });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (msg === 'Failed to fetch' || /proxy|Network|CORS|Load failed/i.test(msg)) {
      // Last resort: direct (may fail CORS in browsers)
      try {
        return await postChatCompletions('https://api.poe.com/v1/chat/completions', key, {
          model,
          messages,
          temperature,
        });
      } catch (directErr) {
        throw new Error(
          'Poe network blocked. Start the app with start.bat (local proxy), then reload.\n\n' +
            (directErr && directErr.message ? directErr.message : String(directErr)),
        );
      }
    }
    throw err;
  }
}

async function postChatCompletions(url, key, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      const e = new Error(`Timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
      e.status = 503;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const errText = await response.text();
  if (!response.ok) {
    const err = new Error(`Poe ${response.status}: ${errText.slice(0, 400)}`);
    err.status = response.status;
    throw err;
  }

  let data;
  try {
    data = JSON.parse(errText);
  } catch {
    throw new Error('Poe returned non-JSON response');
  }

  const text =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    data?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('No content in Poe response');
  }
  return text;
}
