/**
 * Non-network self-checks for verifier + SVG clip (run with Node).
 * node js/qa/selfcheck.mjs
 */
import {
  verifyStraightLineItem,
  arePerpendicular,
  slopeFromGeneral,
  distancePointToLine,
} from '../verify/straightLine.js';
import { clipLineToRect, renderCartesianSvg } from '../graph/cartesianSvg.js';

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg);
  } else {
    console.log('ok:', msg);
  }
}

assert(slopeFromGeneral(1, -1) === 1, 'slope of x-y=0 is 1');
assert(arePerpendicular(1, -1, 1, 1), 'x-y and x+y perpendicular');
assert(Math.abs(distancePointToLine(0, 0, 3, 4, -5) - 1) < 1e-9, 'distance 3-4-5');

const seg = clipLineToRect(1, -1, 0, -5, 5, -5, 5);
assert(seg && seg.length === 2, 'clip line returns segment');

const good = {
  subtopic: 'parallel_perpendicular',
  needs_graph: true,
  graph: {
    x_min: -6,
    x_max: 6,
    y_min: -6,
    y_max: 6,
    lines: [
      { id: 'L1', A: 1, B: -1, C: 0, label: 'L_1' },
      { id: 'L2', A: 1, B: 1, C: -2, label: 'L_2' },
    ],
    points: [{ id: 'A', x: 1, y: 1, label: 'A' }],
  },
  stem_latex: 'In the figure, $L_1$ is perpendicular to $L_2$. Which is true?',
  options: [
    { key: 'A', latex: '$m_1 m_2 = 1$' },
    { key: 'B', latex: '$m_1 m_2 = -1$' },
    { key: 'C', latex: '$m_1 = m_2$' },
    { key: 'D', latex: '$m_1 = 0$' },
  ],
  correct_key: 'B',
  smart_solution_latex: 'Slopes multiply to $-1$. Hence the answer is B.',
  common_traps: ['using product = 1'],
};

const v1 = verifyStraightLineItem(good);
assert(v1.ok, 'valid sample item passes');

const bad = { ...good, correct_key: 'E', options: good.options.slice(0, 3) };
const v2 = verifyStraightLineItem(bad);
assert(!v2.ok, 'invalid item fails');

const svg = renderCartesianSvg(good.graph);
assert(svg.includes('<svg') && svg.includes('</svg>'), 'SVG renders');

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nAll self-checks passed.');
