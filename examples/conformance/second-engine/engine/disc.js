'use strict';
// Discount strategy shapes (7.7). Returns a Rat, or null when the input metric is unresolved.
const D = require('./dec');
const { metric } = require('./ctx');

function stepTiers(st, x) {
  const t = st.tiers; if (!t.length) return D.ZERO;
  const hit = t.find((b) => D.ge(x, b.min) && (b.max === null || D.lt(x, b.max)));
  if (hit) return hit.value;
  const top = t.reduce((a, b) => (D.ge(b.min, a.min) ? b : a));
  return top.max !== null && D.ge(x, top.max) ? top.value : D.ZERO;
}
const capAt = (v, m) => (m === null ? v : D.min(v, m));
function piecewise(st, x) {
  const p = st.points;
  if (p.length < 2 || p.some((q, i) => i && !D.gt(q.x, p[i - 1].x))) return undefined;
  if (D.lt(x, p[0].x)) return D.ZERO;
  if (D.ge(x, p[p.length - 1].x)) return capAt(p[p.length - 1].y, st.max_value);
  const i = p.findIndex((q, k) => k < p.length - 1 && D.ge(x, q.x) && D.lt(x, p[k + 1].x));
  const f = D.div(D.sub(x, p[i].x), D.sub(p[i + 1].x, p[i].x));
  return capAt(D.add(p[i].y, D.mul(f, D.sub(p[i + 1].y, p[i].y))), st.max_value);
}
function strategyValue(S, strat) {
  const sh = strat.shape, st = sh[sh.type];
  if (!st) return null;
  const x = metric(S, st.metric); if (x === null) return null;
  if (sh.type === 'step_tiers') return stepTiers(st, x);
  if (sh.type === 'linear_ramp') return D.lt(x, st.start_at) ? D.ZERO : capAt(D.add(st.start_value, D.mul(st.slope_per_unit, D.sub(x, st.start_at))), st.max_value);
  if (sh.type === 'piecewise_linear') { const v = piecewise(st, x); return v === undefined ? null : v; }
  const row = st.table.find((r) => r.key === D.fmt(x, 40));
  return row ? row.value : null;
}
module.exports = { strategyValue };
