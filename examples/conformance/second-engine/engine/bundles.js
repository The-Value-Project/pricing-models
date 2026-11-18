'use strict';
// Phase 3b: bundle selection and adjustment (7.4 step 2).
const D = require('./dec');
const { eligible } = require('./ctx');
const { applyPct, dropped } = require('./adj');

// Fills S.bundlesApplied with the selected bundles that apply.
function setupBundles(S) {
  S.bundlesApplied = [];
  S.C.bundle_selections.forEach((bs) => {
    const be = S.bundles.get(bs.bundle_id); if (!be) return; const b = be.o;
    const ov = S.variant && S.variant.overrides.bundle_eligibility_overrides.find((x) => x.bundle_id === b.id);
    const ok = (ov ? ov.enabled : eligible(S, b.eligibility)) && b.product_ids.every((id) => S.C.product_selections.some((s) => s.product_id === id));
    if (ok) { if (D.lt(b.adjustment.percent, -100)) S.err('invalid_percent'); S.bundlesApplied.push(be); } else dropped(S);
  });
}
function applyBundles(S, l) {
  for (const be of S.bundlesApplied) if (be.o.product_ids.includes(l.product_id)) applyPct(S, l, be.o.adjustment.percent, 'bundle_discount', `model#/bundles/${be.i}`, be.o.label);
}
module.exports = { setupBundles, applyBundles };
