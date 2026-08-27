/**
 * Gemini client — browser API key now; proxy mode for future Gemini Enterprise.
 *
 * Modes:
 *   browserKey — direct call to generativelanguage.googleapis.com
 *   proxy      — POST to window.GEMINI_PROXY_URL or /api/generate
 *
 * Set window.DSE_MC_GEMINI_MODE = 'proxy' to force proxy without URL sniffing.
 */

export const GEMINI_MODEL = 'gemini-flash-lite-latest';

/** Short queue — keep it small so Generate fails fast instead of waiting minutes. */
export const GEMINI_MODEL_FALLBACKS = [
  'gemini-flash-lite-latest',
  'gemini-2.5-flash',
  'gemini-flash-latest',
];

const REQUEST_TIMEOUT_MS = 20000;
const MAX_MODELS_TO_TRY = 3;

function buildModelQueue(preferredModel) {
  const queue = [preferredModel];
  for (const m of GEMINI_MODEL_FALLBACKS) {
    if (!queue.includes(m)) queue.push(m);
  }
  return queue.slice(0, MAX_MODELS_TO_TRY);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseJsonResponse(text) {
  if (!text) throw new Error('Empty response from API');
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) return JSON.parse(fenceMatch[1].trim());
    const braceMatch = trimmed.match(/\{[\s\S]*\}/);
    if (braceMatch) return JSON.parse(braceMatch[0]);
    throw new Error('Unable to parse JSON from API response');
  }
}

export function getGeminiApiKey() {
  return (
    (typeof window !== 'undefined' &&
      (window.__APP_GEMINI_KEY__ ||
        window.GEMINI_API_KEY ||
        window.__GEMINI_API_KEY__ ||
        (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('gemini_api_key') : ''))) ||
    ''
  );
}

export function getClientMode() {
  if (typeof window === 'undefined') return 'browserKey';
  if (window.DSE_MC_GEMINI_MODE === 'proxy' || window.DSE_MC_GEMINI_MODE === 'browserKey') {
    return window.DSE_MC_GEMINI_MODE;
  }
  if (window.GEMINI_PROXY_URL) return 'proxy';
  return 'browserKey';
}

export function getProxyUrl() {
  if (typeof window === 'undefined') return '/api/generate';
  return window.GEMINI_PROXY_URL || '/api/generate';
}

/**
 * @param {{ mode?: 'browserKey'|'proxy', model?: string }} [config]
 */
export function createGeminiClient(config = {}) {
  const mode = config.mode || getClientMode();
  const preferredModel =
    config.model ||
    (typeof window !== 'undefined' && window.GEMINI_MODEL) ||
    GEMINI_MODEL;

  async function generateContent({ systemPrompt, userText, schema, temperature = 0.85, onProgress }) {
    const body = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userText }],
        },
      ],
      generationConfig: {
        temperature,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    };

    if (mode === 'proxy') {
      return generateViaProxy(body, preferredModel);
    }

    const models = buildModelQueue(preferredModel);
    return generateViaBrowserKey(body, models, onProgress);
  }

  return {
    mode,
    model: preferredModel,
    generateContent,
  };
}

async function generateViaProxy(geminiBody, model) {
  const url = getProxyUrl();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      model,
      ...geminiBody,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Proxy ${response.status}: ${errText.slice(0, 300)}`);
  }
  const data = await response.json();
  // Proxy may return already-parsed JSON or Gemini-shaped payload
  if (data && data.stem_latex) return data;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? data?.text;
  if (typeof text === 'string') return parseJsonResponse(text);
  if (data && typeof data === 'object' && data.result) return data.result;
  throw new Error('Unexpected proxy response shape');
}

async function generateViaBrowserKey(geminiBody, models, onProgress) {
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error(
      'Gemini API key required. Open Settings and paste your key, or run: window.GEMINI_API_KEY = "your-key"',
    );
  }

  const progress = typeof onProgress === 'function' ? onProgress : () => {};
  const list = Array.isArray(models) && models.length ? models : [GEMINI_MODEL];
  let lastError;

  for (let mi = 0; mi < list.length; mi++) {
    const model = list[mi];
    const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    try {
      progress(
        mi === 0
          ? `Calling ${model}…`
          : `Busy — switching to ${model} (${mi + 1}/${list.length})…`,
      );

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let response;
      try {
        response = await fetch(base, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
          body: JSON.stringify(geminiBody),
          credentials: 'omit',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        const errText = await response.text();
        const err = new Error(`API ${response.status}: ${errText.slice(0, 300)}`);
        err.status = response.status;
        throw err;
      }
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No content in API response');
      return parseJsonResponse(text);
    } catch (err) {
      const aborted = err && err.name === 'AbortError';
      const msg = aborted
        ? `Timed out after ${REQUEST_TIMEOUT_MS / 1000}s on ${model}`
        : err && err.message
          ? err.message
          : String(err);
      const status = err && err.status;

      if (msg === 'Failed to fetch') {
        lastError = new Error(
          'Network blocked (CORS). Use a valid Gemini API key from https://aistudio.google.com/apikey',
        );
      } else {
        lastError = aborted ? new Error(msg) : err;
        if (aborted) lastError.status = 503;
      }

      const switchModel =
        aborted ||
        status === 503 ||
        status === 429 ||
        status === 404 ||
        /503|429|high demand|UNAVAILABLE|not found|Timed out/i.test(msg);

      if (switchModel && mi < list.length - 1) {
        await sleep(300);
        continue;
      }
      if (mi < list.length - 1) {
        await sleep(300);
        continue;
      }
    }
  }

  const tip =
    'Gemini is slow/busy right now. Wait a minute and try again, or use QA 1–10 offline.';
  if (lastError && /503|429|high demand|UNAVAILABLE|Timed out/i.test(String(lastError.message))) {
    throw new Error(`${tip}\n\nLast error: ${lastError.message}`);
  }
  throw lastError || new Error(tip);
}
