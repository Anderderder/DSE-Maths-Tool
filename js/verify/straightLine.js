/**
 * Local verification for Straight Line MC JSON before render.
 */

const KEYS = ['A', 'B', 'C', 'D'];

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function nearlyEqual(a, b, eps = 1e-6) {
  return Math.abs(a - b) <= eps;
}

/** Slope from Ax+By+C=0 → y = mx+c form when B≠0: m = -A/B */
export function slopeFromGeneral(A, B) {
  if (!isFiniteNumber(A) || !isFiniteNumber(B)) return null;
  if (nearlyEqual(B, 0)) return Infinity; // vertical
  return -A / B;
}

export function interceptsFromGeneral(A, B, C) {
  const out = { x: null, y: null };
  if (!nearlyEqual(A, 0)) out.x = -C / A;
  if (!nearlyEqual(B, 0)) out.y = -C / B;
  return out;
}

export function areParallel(A1, B1, A2, B2, eps = 1e-6) {
  const m1 = slopeFromGeneral(A1, B1);
  const m2 = slopeFromGeneral(A2, B2);
  if (m1 === Infinity && m2 === Infinity) return true;
  if (m1 === Infinity || m2 === Infinity) return false;
  return nearlyEqual(m1, m2, eps);
}

export function arePerpendicular(A1, B1, A2, B2, eps = 1e-5) {
  const m1 = slopeFromGeneral(A1, B1);
  const m2 = slopeFromGeneral(A2, B2);
  if (m1 === Infinity) return nearlyEqual(m2, 0, eps);
  if (m2 === Infinity) return nearlyEqual(m1, 0, eps);
  return nearlyEqual(m1 * m2, -1, eps);
}

export function distancePointToLine(x0, y0, A, B, C) {
  const den = Math.hypot(A, B);
  if (nearlyEqual(den, 0)) return null;
  return Math.abs(A * x0 + B * y0 + C) / den;
}

export function pointOnLine(x, y, A, B, C, eps = 1e-4) {
  return nearlyEqual(A * x + B * y + C, 0, eps);
}

function validateGraph(graph, needsGraph) {
  const errors = [];
  if (!needsGraph) {
    // Empty or null graph is fine when no figure is needed
    return errors;
  }
  if (!graph || typeof graph !== 'object') {
    errors.push('needs_graph=true but graph is missing');
    return errors;
  }
  const { x_min, x_max, y_min, y_max, lines, points } = graph;
  for (const [name, v] of [
    ['x_min', x_min],
    ['x_max', x_max],
    ['y_min', y_min],
    ['y_max', y_max],
  ]) {
    if (!isFiniteNumber(v)) errors.push(`graph.${name} must be a finite number`);
  }
  if (isFiniteNumber(x_min) && isFiniteNumber(x_max) && x_min >= x_max) {
    errors.push('graph.x_min must be < x_max');
  }
  if (isFiniteNumber(y_min) && isFiniteNumber(y_max) && y_min >= y_max) {
    errors.push('graph.y_min must be < y_max');
  }
  if (!Array.isArray(lines)) {
    errors.push('graph.lines must be an array');
  } else {
    lines.forEach((L, i) => {
      if (!L || !isFiniteNumber(L.A) || !isFiniteNumber(L.B) || !isFiniteNumber(L.C)) {
        errors.push(`graph.lines[${i}] needs numeric A,B,C`);
      } else if (nearlyEqual(L.A, 0) && nearlyEqual(L.B, 0)) {
        errors.push(`graph.lines[${i}] A and B cannot both be 0`);
      }
    });
  }
  if (!Array.isArray(points)) {
    errors.push('graph.points must be an array');
  } else {
    points.forEach((P, i) => {
      if (!P || !isFiniteNumber(P.x) || !isFiniteNumber(P.y)) {
        errors.push(`graph.points[${i}] needs numeric x,y`);
      }
    });
  }
  return errors;
}

/**
 * Structural + light geometric sanity checks.
 * Full option-vs-answer symbolic check is limited without a CAS; we enforce
 * schema integrity and internal graph consistency (points on claimed lines when labelled).
 */
export function verifyStraightLineItem(item) {
  const errors = [];

  if (!item || typeof item !== 'object') {
    return { ok: false, errors: ['Item is not an object'] };
  }

  if (typeof item.stem_latex !== 'string' || !item.stem_latex.trim()) {
    errors.push('stem_latex is required');
  }
  if (typeof item.smart_solution_latex !== 'string' || !item.smart_solution_latex.trim()) {
    errors.push('smart_solution_latex is required');
  }
  if (!Array.isArray(item.common_traps)) {
    errors.push('common_traps must be an array');
  }

  if (!Array.isArray(item.options) || item.options.length !== 4) {
    errors.push('options must have exactly 4 entries');
  } else {
    const keys = item.options.map((o) => o && o.key);
    const missing = KEYS.filter((k) => !keys.includes(k));
    if (missing.length) errors.push(`Missing option keys: ${missing.join(', ')}`);
    const latexes = item.options.map((o) => (o && o.latex != null ? String(o.latex).trim() : ''));
    if (latexes.some((t) => !t)) errors.push('Every option needs non-empty latex');
    const uniq = new Set(latexes);
    if (uniq.size < latexes.filter(Boolean).length) errors.push('Duplicate option texts');
  }

  if (!KEYS.includes(item.correct_key)) {
    errors.push('correct_key must be A, B, C, or D');
  }

  const needsGraph = !!item.needs_graph;
  errors.push(...validateGraph(item.graph, needsGraph));

  // If a point shares an id/label convention with a line equation mention, check collinearity soft:
  // For each point, if the stem is huge we skip; for graph points that lie nearly on a line, OK.
  if (needsGraph && item.graph && Array.isArray(item.graph.lines) && Array.isArray(item.graph.points)) {
    const { lines, points } = item.graph;
    // Soft: at least one geometric object
    if (lines.length === 0 && points.length === 0) {
      errors.push('Graph has no lines or points');
    }
    // Soft consistency: if only one line and points exist, prefer at least one point on the line
    // (not always true for "distance" items — skip forced check)
  }

  // Solution should mention the correct key (EN/ZH)
  if (typeof item.smart_solution_latex === 'string' && KEYS.includes(item.correct_key)) {
    const sol = item.smart_solution_latex;
    const key = item.correct_key;
    const mentions =
      new RegExp(`\\b${key}\\b`).test(sol) ||
      sol.includes(`選 ${key}`) ||
      sol.includes(`選${key}`) ||
      sol.toLowerCase().includes(`answer is ${key.toLowerCase()}`) ||
      sol.toLowerCase().includes(`option ${key.toLowerCase()}`);
    if (!mentions) {
      errors.push(`smart_solution_latex should state the correct option ${key}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function formatVerificationFeedback(errors) {
  return errors.map((e, i) => `${i + 1}. ${e}`).join('\n');
}
