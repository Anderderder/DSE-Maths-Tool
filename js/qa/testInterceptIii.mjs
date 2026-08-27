import {
  buildPatternA,
  buildPatternB,
  verifyInterceptIiiSkeleton,
} from '../topics/interceptIii.js';
import { renderCartesianSvg } from '../graph/cartesianSvg.js';

let fail = 0;
function assert(cond, msg) {
  if (!cond) {
    fail += 1;
    console.error('FAIL', msg);
  } else console.log('ok', msg);
}

for (let i = 0; i < 20; i++) {
  const a = buildPatternA('en');
  const va = verifyInterceptIiiSkeleton(a);
  assert(va.ok, `A${i} verify`);
  assert(a.needs_graph && a.graph.ticks.x.includes(1), `A${i} tick`);
  const svg = renderCartesianSvg(a.graph);
  assert(svg.includes('<svg') && svg.includes('>1<'), `A${i} svg has tick 1`);

  const b = buildPatternB('en');
  const vb = verifyInterceptIiiSkeleton(b);
  assert(vb.ok, `B${i} verify`);
  assert(b.graph.ticks.x.includes(-1) && b.graph.ticks.y.includes(1), `B${i} ticks`);
}

if (fail) {
  console.error(fail, 'failures');
  process.exit(1);
}
console.log('All intercept III checks passed');
