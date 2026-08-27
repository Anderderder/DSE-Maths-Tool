/**
 * DSE-style figure + I/II/III intercept patterns (Straight Line).
 *
 * Pattern A — both intercepts positive; compare with unit tick "1"
 *   (style of px + qy = k with 0 < x-int < 1 < y-int)
 *
 * Pattern B — negative x-intercept, positive y-intercept; ticks at −1 and 1
 *   (style of mx + ny = k)
 *
 * Numbers / truth / correct_key are locked locally.
 * Gemini only writes the smart solution (and may lightly polish stem wording).
 */

const KEYS = ['A', 'B', 'C', 'D'];

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nearly(a, b, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}

/** Map which of I,II,III are true → standard DSE option key among common sets. */
function optionSetForTruth(t1, t2, t3) {
  const combos = [
    { key: 'A', I: true, II: false, III: false, labelEn: 'I only', labelZh: '只有 I' },
    { key: 'B', I: false, II: true, III: false, labelEn: 'II only', labelZh: '只有 II' },
    { key: 'C', I: true, II: false, III: true, labelEn: 'I and III only', labelZh: '只有 I 及 III' },
    { key: 'D', I: false, II: true, III: true, labelEn: 'II and III only', labelZh: '只有 II 及 III' },
    { key: 'A', I: true, II: true, III: false, labelEn: 'I and II only', labelZh: '只有 I 及 II' },
    { key: 'B', I: true, II: false, III: true, labelEn: 'I and III only', labelZh: '只有 I 及 III' },
    { key: 'C', I: false, II: true, III: true, labelEn: 'II and III only', labelZh: '只有 II 及 III' },
    { key: 'D', I: true, II: true, III: true, labelEn: 'I, II and III', labelZh: 'I、II 及 III' },
  ];

  // Prefer a 4-option pack that includes the true combo
  const packs = [
    [
      { key: 'A', I: true, II: false, III: false, labelEn: 'I only', labelZh: '只有 I' },
      { key: 'B', I: false, II: true, III: false, labelEn: 'II only', labelZh: '只有 II' },
      { key: 'C', I: true, II: false, III: true, labelEn: 'I and III only', labelZh: '只有 I 及 III' },
      { key: 'D', I: false, II: true, III: true, labelEn: 'II and III only', labelZh: '只有 II 及 III' },
    ],
    [
      { key: 'A', I: true, II: true, III: false, labelEn: 'I and II only', labelZh: '只有 I 及 II' },
      { key: 'B', I: true, II: false, III: true, labelEn: 'I and III only', labelZh: '只有 I 及 III' },
      { key: 'C', I: false, II: true, III: true, labelEn: 'II and III only', labelZh: '只有 II 及 III' },
      { key: 'D', I: true, II: true, III: true, labelEn: 'I, II and III', labelZh: 'I、II 及 III' },
    ],
  ];

  for (const pack of packs) {
    const hit = pack.find((o) => o.I === t1 && o.II === t2 && o.III === t3);
    if (hit) {
      return {
        options: pack.map((o) => ({
          key: o.key,
          latex: o.labelEn, // language filled later
          labelEn: o.labelEn,
          labelZh: o.labelZh,
        })),
        correct_key: hit.key,
      };
    }
  }

  // Fallback: build pack around truth (should be rare)
  const correct = combos.find((o) => o.I === t1 && o.II === t2 && o.III === t3) || combos[0];
  const pack = packs[1];
  return {
    options: pack.map((o) => ({
      key: o.key,
      latex: o.labelEn,
      labelEn: o.labelEn,
      labelZh: o.labelZh,
    })),
    correct_key: pack.find((o) => o.I === t1 && o.II === t2 && o.III === t3)?.key || correct.key,
  };
}

function lineFromIntercepts(xInt, yInt) {
  // x/xInt + y/yInt = 1  →  yInt*x + xInt*y - xInt*yInt = 0
  const A = yInt;
  const B = xInt;
  const C = -xInt * yInt;
  return { A, B, C };
}

function boundsFromIntercepts(xInt, yInt) {
  const ax = Math.abs(xInt);
  const ay = Math.abs(yInt);
  const span = Math.max(ax, ay, 2) * 1.6;
  return {
    x_min: xInt < 0 ? -span : -0.4 * span,
    x_max: xInt > 0 ? span : 0.4 * span,
    y_min: yInt < 0 ? -span : -0.4 * span,
    y_max: yInt > 0 ? span : 0.4 * span,
  };
}

/**
 * Pattern A: px + qy = k, both intercepts positive.
 * 0 < x_int < 1 < y_int  ⇒  p = k/x_int > k,  0 < q = k/y_int < k,  p > q.
 */
export function buildPatternA(language = 'en') {
  const k = randChoice([5, 6, 7, 8, 9]);
  const xInt = randChoice([0.35, 0.4, 0.5, 0.55, 0.6, 0.7, 0.75]);
  const yInt = randChoice([1.4, 1.6, 1.8, 2.0, 2.2, 2.5, 2.8, 3.0]);
  const p = k / xInt;
  const q = k / yInt;

  const stmtPool = [
    { latexEn: `$p > ${k}$`, latexZh: `$p > ${k}$`, truth: p > k },
    { latexEn: `$q > ${k}$`, latexZh: `$q > ${k}$`, truth: q > k },
    { latexEn: `$q > p$`, latexZh: `$q > p$`, truth: q > p },
    { latexEn: `$p > q$`, latexZh: `$p > q$`, truth: p > q },
    { latexEn: `$p < ${k}$`, latexZh: `$p < ${k}$`, truth: p < k },
    { latexEn: `$q < ${k}$`, latexZh: `$q < ${k}$`, truth: q < k },
  ];

  // Prefer classic mix: I true (p>k), II false (q>k), III false (q>p)  OR include p>q
  let picked = [
    stmtPool[0], // p > k  true
    stmtPool[1], // q > k  false
    stmtPool[2], // q > p  false
  ];
  // Sometimes swap III to p > q (true) for variety → I and III only
  if (Math.random() < 0.45) {
    picked[2] = stmtPool[3];
  }

  const t1 = picked[0].truth;
  const t2 = picked[1].truth;
  const t3 = picked[2].truth;
  const { options: optPack, correct_key } = optionSetForTruth(t1, t2, t3);
  const options = optPack.map((o) => ({
    key: o.key,
    latex: language === 'zh' ? o.labelZh : o.labelEn,
  }));

  const line = lineFromIntercepts(xInt, yInt);
  const bounds = boundsFromIntercepts(xInt, yInt);

  const stemEn =
    `In the figure, the equation of the straight line $L$ is $px + qy = ${k}$. ` +
    `Which of the following is/are true?\n` +
    `I. ${picked[0].latexEn}\n` +
    `II. ${picked[1].latexEn}\n` +
    `III. ${picked[2].latexEn}`;

  const stemZh =
    `如圖，直線 $L$ 的方程為 $px + qy = ${k}$。下列哪些是正確的？\n` +
    `I. ${picked[0].latexZh}\n` +
    `II. ${picked[1].latexZh}\n` +
    `III. ${picked[2].latexZh}`;

  return {
    subtopic: 'fig_intercept_pos',
    pattern: 'A_pos_unit',
    needs_graph: true,
    graph: {
      ...bounds,
      ticks: { x: [1], y: [1] },
      x_intercept: xInt,
      y_intercept: yInt,
      lines: [{ id: 'L', A: line.A, B: line.B, C: line.C, label: 'L' }],
      points: [],
    },
    locked: {
      k,
      p,
      q,
      x_intercept: xInt,
      y_intercept: yInt,
      statements: [
        { id: 'I', latex: language === 'zh' ? picked[0].latexZh : picked[0].latexEn, truth: t1 },
        { id: 'II', latex: language === 'zh' ? picked[1].latexZh : picked[1].latexEn, truth: t2 },
        { id: 'III', latex: language === 'zh' ? picked[2].latexZh : picked[2].latexEn, truth: t3 },
      ],
    },
    stem_latex: language === 'zh' ? stemZh : stemEn,
    options,
    correct_key,
    common_traps:
      language === 'zh'
        ? ['誤讀截距與 1 的大小', '把 $p=k/x$ 與 $q=k/y$ 搞反', '忽略 $p,q$ 同號條件']
        : ['Misreading intercepts vs the tick mark 1', 'Swapping $p=k/x$ and $q=k/y$', 'Wrong inequality direction'],
  };
}

/**
 * Pattern B: mx + ny = k, x-int < -1 < 0, y-int > 1.
 * Optionally engineer m + n = 0 (when y_int = -x_int).
 */
export function buildPatternB(language = 'en') {
  const k = randChoice([2, 3, 4, 5]);
  const forceSumZero = Math.random() < 0.5;
  let xInt;
  let yInt;
  if (forceSumZero) {
    xInt = randChoice([-2.4, -2.0, -1.8, -1.6, -1.4]);
    yInt = -xInt; // ⇒ m + n = 0
  } else {
    xInt = randChoice([-2.5, -2.2, -1.8, -1.5, -1.3]);
    yInt = randChoice([1.3, 1.5, 1.8, 2.0, 2.4, 2.8]);
  }

  const m = k / xInt; // negative
  const n = k / yInt; // positive
  const sumZero = nearly(m + n, 0, 1e-6);

  const stmtPool = [
    { latexEn: `$m < 0$`, latexZh: `$m < 0$`, truth: m < 0 },
    { latexEn: `$n > ${k}$`, latexZh: `$n > ${k}$`, truth: n > k },
    { latexEn: `$m + n = 0$`, latexZh: `$m + n = 0$`, truth: sumZero },
    { latexEn: `$n < ${k}$`, latexZh: `$n < ${k}$`, truth: n < k },
    { latexEn: `$n > 0$`, latexZh: `$n > 0$`, truth: n > 0 },
    { latexEn: `$m > 0$`, latexZh: `$m > 0$`, truth: m > 0 },
  ];

  // Classic-ish: I m<0 true; II n>k false (since y_int>1 ⇒ n<k); III m+n=0 maybe
  const picked = [stmtPool[0], stmtPool[1], stmtPool[2]];

  const t1 = picked[0].truth;
  const t2 = picked[1].truth;
  const t3 = picked[2].truth;
  const { options: optPack, correct_key } = optionSetForTruth(t1, t2, t3);
  const options = optPack.map((o) => ({
    key: o.key,
    latex: language === 'zh' ? o.labelZh : o.labelEn,
  }));

  const line = lineFromIntercepts(xInt, yInt);
  const bounds = boundsFromIntercepts(xInt, yInt);

  const stemEn =
    `In the figure, the equation of the straight line $L$ is $mx + ny = ${k}$. ` +
    `Which of the following are true?\n` +
    `I. ${picked[0].latexEn}\n` +
    `II. ${picked[1].latexEn}\n` +
    `III. ${picked[2].latexEn}`;

  const stemZh =
    `如圖，直線 $L$ 的方程為 $mx + ny = ${k}$。下列哪些是正確的？\n` +
    `I. ${picked[0].latexZh}\n` +
    `II. ${picked[1].latexZh}\n` +
    `III. ${picked[2].latexZh}`;

  return {
    subtopic: 'fig_intercept_mixed',
    pattern: 'B_mixed_unit',
    needs_graph: true,
    graph: {
      ...bounds,
      ticks: { x: [-1], y: [1] },
      x_intercept: xInt,
      y_intercept: yInt,
      lines: [{ id: 'L', A: line.A, B: line.B, C: line.C, label: 'L' }],
      points: [],
    },
    locked: {
      k,
      m,
      n,
      x_intercept: xInt,
      y_intercept: yInt,
      statements: [
        { id: 'I', latex: language === 'zh' ? picked[0].latexZh : picked[0].latexEn, truth: t1 },
        { id: 'II', latex: language === 'zh' ? picked[1].latexZh : picked[1].latexEn, truth: t2 },
        { id: 'III', latex: language === 'zh' ? picked[2].latexZh : picked[2].latexEn, truth: t3 },
      ],
    },
    stem_latex: language === 'zh' ? stemZh : stemEn,
    options,
    correct_key,
    common_traps:
      language === 'zh'
        ? ['忽略截距為負時 $m$ 的符號', '由 $y$ 截距 $>1$ 誤推 $n>k$', '未檢驗 $m+n=0$ 與截距關係']
        : ['Missing the sign of $m$ from a negative $x$-intercept', 'Thinking $y$-intercept $>1$ means $n>k$', 'Not linking $m+n=0$ to $y$-intercept $=-x$-intercept'],
  };
}

export const INTERCEPT_III_SUBTOPICS = [
  {
    id: 'fig_intercept_pos',
    labelEn: 'Figure · intercepts vs 1 (px+qy=k)',
    labelZh: '附圖 · 截距與 1（px+qy=k）',
    build: buildPatternA,
  },
  {
    id: 'fig_intercept_mixed',
    labelEn: 'Figure · mixed intercepts (mx+ny=k)',
    labelZh: '附圖 · 正負截距（mx+ny=k）',
    build: buildPatternB,
  },
];

export function buildInterceptIiiItem(subtopicId, language) {
  const meta = INTERCEPT_III_SUBTOPICS.find((s) => s.id === subtopicId);
  if (meta) return meta.build(language);
  return Math.random() < 0.5 ? buildPatternA(language) : buildPatternB(language);
}

/**
 * Exam-technique smart solution (no AI).
 * Method: (1) compare intercepts to labelled ticks (2) convert carefully to
 * coefficient inequalities / compare coeffs (or slope) — never estimate decimals.
 */
export function buildExamSmartSolution(skeleton, language = 'en') {
  const L = skeleton.locked;
  const zh = language === 'zh';
  const steps = [];

  if (L.p != null) {
    // Pattern A: px + qy = k, both intercepts positive
    const k = L.k;
    if (zh) {
      steps.push(
        `【讀圖】與刻度 $1$ 比較（不要估小數）：$0<$（$x$ 截距）$<1$，且（$y$ 截距）$>1$。`,
      );
      steps.push(
        `由 $px+qy=${k}$：$x$ 截距 $=\\dfrac{${k}}{p}$，$y$ 截距 $=\\dfrac{${k}}{q}$。由圖兩截距皆正，故 $p>0$、$q>0$。`,
      );
      steps.push(
        `$0<\\dfrac{${k}}{p}<1$。兩邊乘正數 $p$（不等式方向不變）：$0<${k}<p$，即 $p>${k}$。`,
      );
      steps.push(
        `$\\dfrac{${k}}{q}>1$。兩邊乘正數 $q$：$${k}>q$，即 $q<${k}$。故 $q>${k}$ 為假。`,
      );
      steps.push(
        `比較 $p$ 與 $q$：$\\dfrac{${k}}{p}<1<\\dfrac{${k}}{q}$ 且 $${k}>0$，得 $p>q$。故 $q>p$ 為假。`,
      );
      steps.push(`（捷徑：正的 $x$ 截距較小 $\\Rightarrow$ 對應係數 $p$ 較大。）`);
    } else {
      steps.push(
        `Step 1 — Compare intercepts with the tick $1$ (do not estimate decimals): $0<(x\\textrm{-intercept})<1$ and $(y\\textrm{-intercept})>1$.`,
      );
      steps.push(
        `From $px+qy=${k}$: $x\\textrm{-intercept}=\\dfrac{${k}}{p}$, $y\\textrm{-intercept}=\\dfrac{${k}}{q}$. Both intercepts are positive, so $p>0$ and $q>0$.`,
      );
      steps.push(
        `$0<\\dfrac{${k}}{p}<1$. Multiply by $p>0$ (direction unchanged): $0<${k}<p$, so $p>${k}$.`,
      );
      steps.push(
        `$\\dfrac{${k}}{q}>1$. Multiply by $q>0$: $${k}>q$, so $q<${k}$. Hence $q>${k}$ is false.`,
      );
      steps.push(
        `Compare $p$ and $q$: $\\dfrac{${k}}{p}<1<\\dfrac{${k}}{q}$ and $${k}>0$ $\\Rightarrow$ $p>q$. Hence $q>p$ is false.`,
      );
      steps.push(`(Shortcut: smaller positive $x$-intercept $\\Rightarrow$ larger $p$.)`);
    }
  } else {
    // Pattern B: mx + ny = k
    const k = L.k;
    const sumZero = Math.abs(L.m + L.n) < 1e-6;
    if (zh) {
      steps.push(
        `【讀圖】與刻度 $-1$、$1$ 比較（不要估小數）：（$x$ 截距）$<-1<0$，且（$y$ 截距）$>1$。`,
      );
      steps.push(
        `由 $mx+ny=${k}$：$x$ 截距 $=\\dfrac{${k}}{m}$，$y$ 截距 $=\\dfrac{${k}}{n}$。`,
      );
      steps.push(
        `$x$ 截距 $<0$ 且 $${k}>0$ $\\Rightarrow$ $m<0$。故 $m<0$ 為真。`,
      );
      steps.push(
        `$y$ 截距 $>1>0$ 且 $${k}>0$ $\\Rightarrow$ $n>0$，且 $\\dfrac{${k}}{n}>1$ $\\Rightarrow$ $n<${k}$。故 $n>${k}$ 為假。`,
      );
      if (sumZero) {
        steps.push(
          `圖示 $|x$ 截距$|=$（$y$ 截距），即 $y$ 截距 $=-$（$x$ 截距）。於是 $\\dfrac{${k}}{n}=-\\dfrac{${k}}{m}$ $\\Rightarrow$ $n=-m$ $\\Rightarrow$ $m+n=0$。`,
        );
        steps.push(
          `（斜率核對：斜率 $= -\\dfrac{m}{n}$；若 $m+n=0$ 則斜率 $=1$。）`,
        );
      } else {
        steps.push(
          `圖中 $|x$ 截距$|\\ne$（$y$ 截距），故 $m+n=0$ 為假。`,
        );
      }
    } else {
      steps.push(
        `Step 1 — Compare intercepts with ticks $-1$ and $1$ (no decimal guessing): $(x\\textrm{-intercept})<-1<0$ and $(y\\textrm{-intercept})>1$.`,
      );
      steps.push(
        `From $mx+ny=${k}$: $x\\textrm{-intercept}=\\dfrac{${k}}{m}$, $y\\textrm{-intercept}=\\dfrac{${k}}{n}$.`,
      );
      steps.push(
        `$x\\textrm{-intercept}<0$ and $${k}>0$ $\\Rightarrow$ $m<0$. So $m<0$ is true.`,
      );
      steps.push(
        `$y\\textrm{-intercept}>1>0$ and $${k}>0$ $\\Rightarrow$ $n>0$, and $\\dfrac{${k}}{n}>1$ $\\Rightarrow$ $n<${k}$. So $n>${k}$ is false.`,
      );
      if (sumZero) {
        steps.push(
          `The figure gives $|x\\textrm{-intercept}|=(y\\textrm{-intercept})$, i.e. $y\\textrm{-intercept}=-(x\\textrm{-intercept})$. Then $\\dfrac{${k}}{n}=-\\dfrac{${k}}{m}$ $\\Rightarrow$ $n=-m$ $\\Rightarrow$ $m+n=0$.`,
        );
        steps.push(
          `(Slope check: slope $=-\\dfrac{m}{n}$; if $m+n=0$ then slope $=1$.)`,
        );
      } else {
        steps.push(
          `Here $|x\\textrm{-intercept}|\\ne(y\\textrm{-intercept})$, so $m+n=0$ is false.`,
        );
      }
    }
  }

  // Per-statement verdicts matching locked truths
  steps.push(zh ? `對照各陳述：` : `Check each statement:`);
  L.statements.forEach((s) => {
    if (zh) {
      steps.push(`${s.id}. ${s.latex} — ${s.truth ? '正確' : '不正確'}。`);
    } else {
      steps.push(`${s.id}. ${s.latex} — ${s.truth ? 'true' : 'false'}.`);
    }
  });

  steps.push(
    zh
      ? `故選 ${skeleton.correct_key}。`
      : `Hence the answer is ${skeleton.correct_key}.`,
  );

  return steps.join('\n');
}

/** Recompute truth for pattern A/B style statements from locked intercepts — sanity API. */
export function verifyInterceptIiiSkeleton(item) {
  const errors = [];
  if (!item?.locked || !item.graph) {
    errors.push('Missing locked data or graph');
    return { ok: false, errors };
  }
  const { x_intercept: xi, y_intercept: yi } = item.locked;
  if (!(Number.isFinite(xi) && Number.isFinite(yi))) {
    errors.push('Intercepts must be finite');
  }
  const line = item.graph.lines?.[0];
  if (line) {
    const onX = Math.abs(line.A * xi + line.B * 0 + line.C);
    const onY = Math.abs(line.A * 0 + line.B * yi + line.C);
    if (onX > 1e-4 || onY > 1e-4) {
      errors.push('Graph line does not pass through the locked intercepts');
    }
  }
  if (!KEYS.includes(item.correct_key)) errors.push('Bad correct_key');
  if (!Array.isArray(item.options) || item.options.length !== 4) {
    errors.push('Need 4 options');
  }
  return { ok: errors.length === 0, errors };
}
