'use strict';
// Phase 5: overage per pool and year, policy, overage lines and entitlement summary (7.6, 8).
const D = require('./dec');
const P = require('./price');
const { billed } = require('./ctx');
const { demand } = require('./sel');
const { poolOverage, UNL } = require('./pools');
const { mkLine } = require('./lines');
const { replace } = require('./replace');
const { overrides } = require('./adj');

function policyOf(S, c, sels) {
  const seen = new Set();
  sels.forEach((X) => { if (X.grants.some((g) => g.credit_type_id === c.id) && X.tier.overage_policy !== 'unknown') seen.add(X.tier.overage_policy); });
  if (seen.size > 1) { S.err('conflicting_overage_policy'); return c.overage_policy; }
  return seen.size === 1 ? [...seen][0] : c.overage_policy;
}
function overageLine(S, c, ci, ovY) {
  const op = c.overage_price;
  if (!op) { S.err('invalid_override'); return null; }
  const qtyAt = (j) => ovY[P.yearOfPeriod(op, j) - 1];
  const l = mkLine(S, { pr: { price: op, ptr: `model#/credit_types/${ci}/overage_price`, cur: op.currency || S.M.currency }, qtyAt, cat: 'usage_overage', kind: 'overage',
    product_id: null, target_id: c.id, label: c.label + ' overage', sel: null, viaTier: false, mod: null });
  if (!l) return null;
  overrides(S).forEach((o, i) => { if (o.target_kind === 'credit_type_overage' && o.target_id === c.id && ['custom_unit_price', 'waived'].includes(o.override_type)) replace(S, l, o, i, 'credit_type:' + c.id); });
  return l;
}
function entitlements(S, sels, pools) {
  const summary = [], olines = [];
  S.M.credit_types.forEach((c, ci) => {
    const cp = pools.filter((p) => p.ct === c.id);
    if (!cp.length && !S.C.product_selections.some((s) => billed(s, c.id))) return;
    const dem = []; for (let y = 1; y <= S.years; y++) dem.push(demand(S, c.id, y));
    const policy = policyOf(S, c, sels), used = dem.reduce((a, b) => D.max(a, b));
    const indet = S.indet.has(c.id) || cp.some((p) => p.unknown);
    let ov = D.ZERO, best = cp[0], ovY = dem.map(() => D.ZERO);
    cp.forEach((p) => dem.forEach((d, y) => { const o = poolOverage(p, d); ovY[y] = D.max(ovY[y], o); if (D.gt(o, ov)) { ov = o; best = p; } }));
    const e = { credit_type_id: c.id, granted: null, committed_or_used: used, overage: null, overage_cost: null, overage_policy: policy };
    if (indet) S.warn('indeterminate_entitlement', 'warning');
    else {
      e.granted = best ? (best.qty === UNL ? D.num(-1n) : best.qty) : null; e.overage = ov; e.overage_cost = D.ZERO;
      if (D.gt(ov, 0)) {
        if (policy === 'pay_as_you_go') { const l = overageLine(S, c, ci, ovY); if (l) { olines.push(l); e.overage_cost = l.run; } }
        else if (policy === 'hard_cap') S.err('hard_cap_exceeded');
        else if (policy === 'unknown') S.warn('indeterminate_entitlement', 'warning');
        else S.warn('overage_not_priced', 'warning');
      }
    }
    summary.push(e);
  });
  return { summary, olines };
}
module.exports = { entitlements };
