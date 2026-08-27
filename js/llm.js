/**
 * LLM provider router — Gemini and/or Poe.
 *
 * Selection (auto):
 *   1. window.DSE_MC_PROVIDER = 'gemini' | 'poe' if that key is present
 *   2. Else Gemini key → Gemini
 *   3. Else Poe key → Poe
 *   4. Else null (caller should show a clear error)
 *
 * Does not remove or replace Gemini; createGeminiClient remains available.
 */

import { createGeminiClient, getGeminiApiKey, getClientMode } from './gemini.js';
import { createPoeClient, getPoeApiKey } from './poe.js';

/**
 * @returns {'gemini'|'poe'|null}
 */
export function resolveProvider() {
  const geminiKey = Boolean(getGeminiApiKey()?.trim());
  const poeKey = Boolean(getPoeApiKey()?.trim());
  const forced =
    typeof window !== 'undefined' && window.DSE_MC_PROVIDER
      ? String(window.DSE_MC_PROVIDER).toLowerCase()
      : '';

  if (forced === 'gemini') {
    if (geminiKey || getClientMode() === 'proxy') return 'gemini';
    return null;
  }
  if (forced === 'poe') {
    if (poeKey) return 'poe';
    return null;
  }

  // Auto: Gemini first (existing default), then Poe
  if (geminiKey || getClientMode() === 'proxy') return 'gemini';
  if (poeKey) return 'poe';
  return null;
}

/**
 * @returns {{ provider: 'gemini'|'poe', hasGemini: boolean, hasPoe: boolean }}
 */
export function getProviderStatus() {
  const hasGemini = Boolean(getGeminiApiKey()?.trim()) || getClientMode() === 'proxy';
  const hasPoe = Boolean(getPoeApiKey()?.trim());
  return {
    provider: resolveProvider(),
    hasGemini,
    hasPoe,
  };
}

/**
 * Create the active LLM client (Gemini or Poe).
 * @param {{ provider?: 'gemini'|'poe', model?: string }} [config]
 */
export function createLlmClient(config = {}) {
  const provider = config.provider || resolveProvider();

  if (provider === 'poe') {
    return createPoeClient({ model: config.model });
  }
  if (provider === 'gemini') {
    const client = createGeminiClient({ model: config.model });
    return {
      ...client,
      provider: 'gemini',
    };
  }

  throw new Error(
    'No AI key found. Open Settings and paste a Gemini API key and/or a Poe API key.',
  );
}
