'use strict';
// Runner: node run.js [case-id ...]  (all cases when none given). Writes out/<id>.json. STUB3=1 skips phase 3 adjustments.
const fs = require('fs');
const path = require('path');
const J = require('./jsonx');
const ctx = require('./ctx');
const { checkRefs } = require('./refs');
const { setup } = require('./prices');
const { selections } = require('./sel');
const { buildLines } = require('./lines');
const { phase3 } = require('./phase3');
const { buildPools } = require('./pools');
const { entitlements } = require('./overage');
const { phase6 } = require('./discounts');
const { minimums } = require('./minimums');
const { assemble } = require('./assemble');
const { validate } = require('./validate');

const B = path.join(__dirname, '..');
const V = path.join(B, '..', 'vectors');
function calc(M, C) {
  const S = ctx.build(M, C);
  if (checkRefs(S)) return { S };
  setup(S);
  const sels = selections(S), lines = buildLines(S, sels);
  lines.forEach((l, i) => { l.id = i + 1; });
  validate(S, sels, lines);
  if (process.env.STUB3) { S.bundlesApplied = []; sels.forEach((X) => { X.planOk = !X.plan || ctx.eligible(S, X.plan.o.eligibility); }); } else phase3(S, lines);
  const { summary, olines } = entitlements(S, sels, buildPools(S, sels));
  olines.forEach((l) => { l.id = lines.length + 1; lines.push(l); });
  S.lines = lines;
  phase6(S, lines); minimums(S, lines);
  return { S, statement: S.errs.length ? null : assemble(S, lines, summary) };
}
function runCase(id) {
  const rd = (f) => J.parse(fs.readFileSync(path.join(V, id, f), 'utf8'));
  const { S, statement } = calc(rd('model.json'), rd('config.json'));
  const out = S.errs.length ? { outcome: 'validation_failure', codes: S.errs } : { outcome: 'statement', statement };
  fs.writeFileSync(path.join(B, 'out', id + '.json'), J.write(out) + '\n');
  return out.outcome === 'statement' ? 'statement' : 'fail:' + S.errs.join(',');
}
const ids = process.argv.length > 2 ? process.argv.slice(2) : fs.readdirSync(V).filter((d) => !d.startsWith('.')).sort();
let crashes = 0;
for (const id of ids) {
  try { console.log(id, runCase(id)); } catch (e) { crashes++; console.log(id, 'CRASH', e.message.split('\n')[0], (e.stack.split('\n')[1] || '').trim()); }
}
console.log(`done: ${ids.length} cases, ${crashes} crashes`);
