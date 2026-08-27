/**
 * HKDSE Equation of Straight Line — topic pack (subtopics, difficulty, schema, prompts).
 */

export const TOPIC_ID = 'equation_of_straight_line';

export const TOPIC_META = {
  id: TOPIC_ID,
  labelEn: 'Equation of Straight Line',
  labelZh: '直線方程',
};

export const SUBTOPICS = [
  {
    id: 'slope_intercepts',
    labelEn: 'Slope & intercepts',
    labelZh: '斜率與截距',
    traps: ['wrong sign of slope', 'swap x- and y-intercepts', 'misread rise/run from graph'],
  },
  {
    id: 'two_point_point_slope',
    labelEn: 'Two-point / point-slope',
    labelZh: '兩點式／點斜式',
    traps: ['use (x1−x2)/(y1−y2)', 'plug wrong point into point-slope', 'forget to rearrange to general form'],
  },
  {
    id: 'parallel_perpendicular',
    labelEn: 'Parallel & perpendicular',
    labelZh: '平行與垂直',
    traps: ['use m1*m2=1 instead of −1', 'confuse parallel with perpendicular', 'sign error on negative reciprocal'],
  },
  {
    id: 'intersection',
    labelEn: 'Intersection of lines',
    labelZh: '直線交點',
    traps: ['solve only one equation', 'arithmetic error in simultaneous equations', 'wrong quadrant of intersection'],
  },
  {
    id: 'distance_point_line',
    labelEn: 'Distance from point to line',
    labelZh: '點到直線距離',
    traps: ['forget absolute value', 'wrong denominator sqrt(A²+B²)', 'use distance between two points instead'],
  },
  {
    id: 'general_form',
    labelEn: 'General form Ax+By+C=0',
    labelZh: '一般式 Ax+By+C=0',
    traps: ['leave A negative when avoidable', 'incorrect conversion from y=mx+c', 'treat C as y-intercept directly'],
  },
];

/** Difficulty rubric mapped to DSE Paper 2 demand (not olympiad). */
export const DIFFICULTY = {
  Easy: {
    id: 'Easy',
    labelEn: 'Easy',
    labelZh: '容易',
    guidanceEn:
      'Single idea, clean integers, often one line and/or clear intercepts. Prefer a readable graph when helpful. Direct computation or direct reading from figure.',
    guidanceZh:
      '單一概念、整數簡潔；常為一條直線及／或清晰截距。有圖時易讀。直接計算或直接從圖讀取。',
    preferGraph: true,
    allowIii: false,
    maxLines: 1,
    algebraicMessiness: 'low',
  },
  Moderate: {
    id: 'Moderate',
    labelEn: 'Moderate',
    labelZh: '中等',
    guidanceEn:
      'Two linked ideas (e.g. find slope then check perpendicular; convert forms). Integers or simple fractions. Graph optional but useful for 1–2 lines.',
    guidanceZh:
      '兩個相連概念（如先求斜率再判斷垂直；轉換方程形式）。整數或簡分數。一至兩條直線，圖可選但有用。',
    preferGraph: true,
    allowIii: false,
    maxLines: 2,
    algebraicMessiness: 'medium',
  },
  Hard: {
    id: 'Hard',
    labelEn: 'Hard',
    labelZh: '困難',
    guidanceEn:
      'Multi-step DSE Section A/B flavour: conditions on constants, parallel/perp with parameters, or I/II/III “which must be true”. Still school-exam level, not contest.',
    guidanceZh:
      '多步 DSE 甲／乙部風格：含參數條件、平行／垂直，或 I/II/III「下列哪些必定正確」。仍屬公開試程度，非競賽。',
    preferGraph: false,
    allowIii: true,
    maxLines: 3,
    algebraicMessiness: 'higher',
  },
};

export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    subtopic: {
      type: 'string',
      description: 'One of the allowed subtopic ids',
    },
    needs_graph: {
      type: 'boolean',
      description: 'Whether a Cartesian figure should be shown',
    },
    graph: {
      type: 'object',
      description:
        'Cartesian figure data when needs_graph is true. If needs_graph is false, still provide an object with empty lines and points arrays and bounds -8..8.',
      properties: {
        x_min: { type: 'number' },
        x_max: { type: 'number' },
        y_min: { type: 'number' },
        y_max: { type: 'number' },
        lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              A: { type: 'number' },
              B: { type: 'number' },
              C: { type: 'number' },
              label: { type: 'string' },
            },
            required: ['id', 'A', 'B', 'C', 'label'],
          },
        },
        points: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              x: { type: 'number' },
              y: { type: 'number' },
              label: { type: 'string' },
            },
            required: ['id', 'x', 'y', 'label'],
          },
        },
      },
      required: ['x_min', 'x_max', 'y_min', 'y_max', 'lines', 'points'],
    },
    stem_latex: {
      type: 'string',
      description: 'MC stem; use $...$ or $$...$$ for math',
    },
    options: {
      type: 'array',
      description: 'Exactly four options A–D',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          latex: { type: 'string' },
        },
        required: ['key', 'latex'],
      },
    },
    correct_key: {
      type: 'string',
      description: 'A, B, C, or D',
    },
    smart_solution_latex: {
      type: 'string',
      description: 'Fastest exam-technique solution ending with the correct option',
    },
    common_traps: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short list of traps the distractors exploit',
    },
  },
  required: [
    'subtopic',
    'needs_graph',
    'graph',
    'stem_latex',
    'options',
    'correct_key',
    'smart_solution_latex',
    'common_traps',
  ],
};

const SYSTEM_PROMPT_FALLBACK = `You are an experienced HKDSE Mathematics Compulsory Part Paper 2 setter and marker.
Generate ONE original multiple-choice question on Equation of Straight Line.
Do NOT copy copyrighted past-paper wording. Match DSE style and difficulty.
Return JSON only matching the schema. Smart solution = fastest correct exam path (6–12 short steps), not a textbook essay.
Use only $...$ / $$...$$ for math. NEVER use \\begin{itemize}, \\begin{enumerate}, \\item, or other document environments — MathJax cannot render them. Use plain "1." / "-" lines for steps.
When needs_graph is true, graph lines use Ax+By+C=0 integers consistent with the stem and correct option.
Exactly four options A–D; one correct; distractors from common student errors.
For wording options write plain text (e.g. II and III only), never \\text{...}. Math options must use $...$.`;

let cachedSystemPrompt = null;

export async function loadSystemPrompt() {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  try {
    const res = await fetch(new URL('../../prompts/straightLine.system.md', import.meta.url));
    if (res.ok) {
      cachedSystemPrompt = await res.text();
      return cachedSystemPrompt;
    }
  } catch {
    /* fall through */
  }
  cachedSystemPrompt = SYSTEM_PROMPT_FALLBACK;
  return cachedSystemPrompt;
}

export function buildUserPrompt({
  language,
  difficulty,
  subtopicId,
  retryFeedback,
}) {
  const diff = DIFFICULTY[difficulty] || DIFFICULTY.Moderate;
  const sub =
    SUBTOPICS.find((s) => s.id === subtopicId) ||
    SUBTOPICS[Math.floor(Math.random() * SUBTOPICS.length)];

  const langLine =
    language === 'zh'
      ? 'Write the stem, options, smart solution, and traps in Traditional Chinese (香港中學用語). Keep math in LaTeX.'
      : 'Write the stem, options, smart solution, and traps in clear English (HKDSE Paper 2 tone). Keep math in LaTeX.';

  const iiiLine = diff.allowIii
    ? 'You MAY use an I / II / III “which of the following must be true?” style item.'
    : 'Do NOT use I/II/III multi-statement items; use a single correct choice among A–D.';

  const graphLine = diff.preferGraph
    ? 'Prefer needs_graph=true with a clean Cartesian figure unless the item is purely algebraic.'
    : 'Use a graph only if it clearly helps; Hard items may be algebraic with needs_graph=false.';

  let text = [
    langLine,
    `Topic: Equation of Straight Line (HKDSE Compulsory Part).`,
    `Target subtopic id: ${sub.id} (${sub.labelEn} / ${sub.labelZh}).`,
    `Typical traps to exploit in distractors: ${sub.traps.join('; ')}.`,
    `Difficulty: ${diff.id}.`,
    `Difficulty guidance: ${language === 'zh' ? diff.guidanceZh : diff.guidanceEn}`,
    `Max lines in figure: about ${diff.maxLines}. Algebraic messiness: ${diff.algebraicMessiness}.`,
    iiiLine,
    graphLine,
    'Produce original numbers. Ensure correct_key matches your smart solution.',
  ].join('\n');

  if (retryFeedback) {
    text += `\n\nPrevious attempt failed validation:\n${retryFeedback}\nFix these issues and regenerate a consistent item.`;
  }

  return { subtopicId: sub.id, userText: text };
}
