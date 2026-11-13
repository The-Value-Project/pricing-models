'use strict';
// Product selections: tier, commitment plan (4.5), charged modules (4.4), quantity and term checks (4.2).
const D = require('./dec');
const { billed, qtyYear, BILLED } = require('./ctx');

function selections(S) {
  const out = [];
  S.C.product_selections.forEach((sel, i) => {
    const pe = S.prod.get(sel.product_id); if (!pe) return;
    const prod = pe.o, tier = prod.tiers.find((t) => t.id === sel.tier_id);
    if (!tier) return;
    let planId = sel.commitment_plan_id, implicit = false;
    if (planId === null && S.C.billing.plan_id !== null && prod.commitment_plans.some((c) => c.id === S.C.billing.plan_id)) { planId = S.C.billing.plan_id; implicit = true; }
    const pl = planId === null ? null : S.plan.get(planId);
    const chosen = new Set(sel.module_selections.map((m) => m.module_id));
    sel.module_selections.forEach((m) => { if (tier.included_modules.includes(m.module_id)) S.err('module_selection_in_tier'); });
    const mods = [];
    prod.modules.forEach((m, mi) => {
      const viaTier = tier.included_modules.includes(m.id) || m.required;
      if (viaTier || chosen.has(m.id)) mods.push({ m, mi, viaTier });
    });
    if (pl && pl.o.commitment_months !== null && S.term < Number(D.num(pl.o.commitment_months).n)) S.err('term_below_commitment');
    out.push({ sel, i, pi: pe.i, prod, tier, ti: prod.tiers.indexOf(tier), plan: pl, planImplicit: implicit, mods });
    checkQuantities(S, sel);
  });
  return out;
}
function checkQuantities(S, sel) {
  const seen = new Set();
  sel.quantities.forEach((q) => {
    const vals = [q.quantity, ...(q.growth_schedule || []).map((g) => g.quantity)];
    if (vals.some((v) => D.lt(v, 0))) S.err('negative_quantity');
    if (q.growth_schedule) {
      const idx = q.growth_schedule.map((g) => D.fmt(g.period_index));
      if (new Set(idx).size !== idx.length) S.err('duplicate_period_index');
    }
    if (BILLED.includes(q.quantity_type)) {
      if (seen.has(q.credit_type_id)) S.err('duplicate_billed_quantity');
      seen.add(q.credit_type_id);
      if (q.quantity_type === 'estimated') S.warn('estimated_quantity', 'warning');
      const mx = sel.quantities.find((m) => m.credit_type_id === q.credit_type_id && m.quantity_type === 'maximum');
      if (mx) for (let y = 1; y <= S.years; y++) if (D.gt(qtyYear(q, y), mx.quantity)) S.err('maximum_exceeded');
    }
  });
}
// Demand of a credit type in contract year y: sum of billed quantities over selections (7.6).
const demand = (S, ct, y) => D.sum(S.C.product_selections.map((s) => { const b = billed(s, ct); return b ? qtyYear(b.e, y) : D.ZERO; }));
module.exports = { selections, demand };
