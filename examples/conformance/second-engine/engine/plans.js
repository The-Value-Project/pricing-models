'use strict';
// Phase 3a: commitment-plan adjustment (7.4 step 1).
const D = require('./dec');
const { eligible } = require('./ctx');
const { applyPct, dropped } = require('./adj');

// The selection's plan when it is eligible; eligibility and percent are checked once per selection.
function planFor(S, X) {
  if (!X.plan) return null;
  if (X.planOk === undefined) {
    X.planOk = eligible(S, X.plan.o.eligibility);
    if (!X.planOk) dropped(S);
    else if (D.lt(X.plan.o.adjustment.percent, -100)) S.err('invalid_percent');
  }
  return X.planOk ? X.plan : null;
}
function applyPlan(S, l) {
  const pl = planFor(S, l.sel); if (!pl) return;
  const t = pl.o.targets;
  if ((t.tier_ids.length === 0 || (l.tierVia && t.tier_ids.includes(l.sel.tier.id))) && (t.module_ids.length === 0 || t.module_ids.includes(l.target_id)))
    applyPct(S, l, pl.o.adjustment.percent, 'commitment_plan_adjustment', `model#/products/${pl.pi}/commitment_plans/${pl.i}`, pl.o.label);
}
module.exports = { planFor, applyPlan };
