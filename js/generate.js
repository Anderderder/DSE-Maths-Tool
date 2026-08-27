/**
 * Generate + verify loop for Straight Line MC items.
 * Intercept I/II/III: locked local maths + exam-technique smart solution (no AI decimals).
 */
import { createLlmClient } from './llm.js';
import {
  RESPONSE_SCHEMA,
  loadSystemPrompt,
  buildUserPrompt,
  SUBTOPICS,
} from './topics/straightLine.js';
import {
  INTERCEPT_III_SUBTOPICS,
  buildInterceptIiiItem,
  buildExamSmartSolution,
  verifyInterceptIiiSkeleton,
} from './topics/interceptIii.js';
import {
  verifyStraightLineItem,
  formatVerificationFeedback,
} from './verify/straightLine.js';
import { sanitizeMcqItem } from './latexSanitize.js';

const MAX_VERIFY_ATTEMPTS = 2;

const INTERCEPT_IDS = new Set(INTERCEPT_III_SUBTOPICS.map((s) => s.id));

export function isInterceptIiiSubtopic(id) {
  return INTERCEPT_IDS.has(id);
}

export function getAllSubtopics() {
  return [...INTERCEPT_III_SUBTOPICS, ...SUBTOPICS];
}

async function generateInterceptIiiMcq(opts) {
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};

  onProgress('Building figure + I/II/III item…');
  const skeleton = buildInterceptIiiItem(opts.subtopicId, opts.language);
  const check = verifyInterceptIiiSkeleton(skeleton);
  if (!check.ok) {
    throw new Error(`Internal item build failed:\n${formatVerificationFeedback(check.errors)}`);
  }

  onProgress('Writing exam-technique smart solution…');
  const solution = buildExamSmartSolution(skeleton, opts.language);

  const item = sanitizeMcqItem({
    ...skeleton,
    smart_solution_latex: solution,
  });

  onProgress('Done');
  return { item, attempts: 1, mode: 'intercept_iii' };
}

/**
 * @param {{
 *   language: 'en'|'zh',
 *   difficulty: string,
 *   subtopicId: string|null,
 *   client?: { generateContent: Function, provider?: string },
 *   onProgress?: (msg: string) => void,
 * }} opts
 */
export async function generateStraightLineMcq(opts) {
  const subId = opts.subtopicId || null;

  // Figure intercept I/II/III patterns (primary focus)
  if (!subId || isInterceptIiiSubtopic(subId)) {
    const id =
      subId && isInterceptIiiSubtopic(subId)
        ? subId
        : INTERCEPT_III_SUBTOPICS[Math.floor(Math.random() * INTERCEPT_III_SUBTOPICS.length)].id;
    return generateInterceptIiiMcq({ ...opts, subtopicId: id });
  }

  const client = opts.client || createLlmClient();
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
  const providerLabel = client.provider === 'poe' ? 'Poe' : 'Gemini';

  onProgress('Loading prompt…');
  const systemPrompt = await loadSystemPrompt();
  let retryFeedback = '';
  let lastErrors = [];

  for (let attempt = 1; attempt <= MAX_VERIFY_ATTEMPTS; attempt++) {
    const { userText } = buildUserPrompt({
      language: opts.language,
      difficulty: opts.difficulty,
      subtopicId: opts.subtopicId,
      retryFeedback: retryFeedback || undefined,
    });

    onProgress(`Calling ${providerLabel}… (attempt ${attempt}/${MAX_VERIFY_ATTEMPTS})`);
    const raw = await client.generateContent({
      systemPrompt,
      userText,
      schema: RESPONSE_SCHEMA,
      temperature: attempt === 1 ? 0.85 : 0.55,
      onProgress,
    });

    onProgress(`Checking answer… (attempt ${attempt}/${MAX_VERIFY_ATTEMPTS})`);

    if (raw && !raw.needs_graph) {
      if (
        raw.graph &&
        Array.isArray(raw.graph.lines) &&
        raw.graph.lines.length === 0 &&
        Array.isArray(raw.graph.points) &&
        raw.graph.points.length === 0
      ) {
        raw.graph = null;
      }
    }

    const { ok, errors } = verifyStraightLineItem(raw);
    if (ok) {
      onProgress('Done');
      return { item: sanitizeMcqItem(raw), attempts: attempt };
    }
    lastErrors = errors;
    retryFeedback = formatVerificationFeedback(errors);
    onProgress(`Retrying (failed checks: ${errors[0] || 'invalid item'})…`);
  }

  throw new Error(
    `Could not produce a valid MCQ after ${MAX_VERIFY_ATTEMPTS} attempts:\n${formatVerificationFeedback(lastErrors)}`,
  );
}
