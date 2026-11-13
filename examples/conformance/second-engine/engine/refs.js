'use strict';
// Reference resolution (4.1, Annex C). Reports unresolved_reference; returns true when the join itself fails.
function checkRefs(S) {
  const { M, C } = S; let bad = false;
  const need = (ok) => { if (!ok) { S.err('unresolved_reference'); bad = true; } };
  const ct = (id) => S.credit_types.has(id);
  need(C.model_reference.model_id === M.model_id);
  const prices = [];
  const grants = (gs) => (gs || []).forEach((g) => need(ct(g.credit_type_id)));
  M.products.forEach((p) => {
    const mods = new Set(p.modules.map((m) => m.id)), tiers = new Set(p.tiers.map((t) => t.id));
    p.modules.forEach((m) => { prices.push(m.price); grants(m.included_credit_grants); });
    p.tiers.forEach((t) => { grants(t.included_credit_grants); t.included_modules.forEach((x) => need(mods.has(x))); });
    p.commitment_plans.forEach((c) => { grants(c.included_credit_grants); c.targets.tier_ids.forEach((x) => need(tiers.has(x))); c.targets.module_ids.forEach((x) => need(mods.has(x))); c.default_for_tier_ids.forEach((x) => need(tiers.has(x))); });
  });
  M.bundles.forEach((b) => { grants(b.included_credit_grants); b.product_ids.forEach((x) => need(S.prod.has(x))); });
  M.discounts.forEach((d) => {
    if (d.targets) { d.targets.module_ids.forEach((x) => need(S.mod.has(x))); d.targets.product_ids.forEach((x) => need(S.prod.has(x))); d.targets.credit_type_ids.forEach((x) => need(ct(x))); }
    if (d.strategy) need(S.discount_strategies.has(d.strategy.strategy_id));
  });
  M.credit_types.forEach((c) => c.overage_price && prices.push(c.overage_price));
  M.credit_packages.forEach((k) => { need(ct(k.credit_type_id)); prices.push(k.price); });
  M.price_books.forEach((b) => { b.module_prices.forEach((x) => { need(S.mod.has(x.module_id)); prices.push(x.price); }); b.credit_package_prices.forEach((x) => { need(S.credit_packages.has(x.credit_package_id)); prices.push(x.price); }); });
  M.variants.forEach((v) => { const o = v.overrides; grants(o.included_credit_grants);
    o.module_price_overrides.forEach((x) => { need(S.mod.has(x.module_id)); prices.push(x.price); });
    o.credit_package_price_overrides.forEach((x) => { need(S.credit_packages.has(x.credit_package_id)); prices.push(x.price); });
    o.discount_eligibility_overrides.forEach((x) => need(S.discounts.has(x.discount_id)));
    o.bundle_eligibility_overrides.forEach((x) => need(S.bundles.has(x.bundle_id))); });
  M.minimum_commitments.forEach((m) => { if (m.targets) { m.targets.product_ids.forEach((x) => need(S.prod.has(x))); m.targets.credit_type_ids.forEach((x) => need(ct(x))); } });
  prices.forEach((p) => p.credit_type_id !== null && need(ct(p.credit_type_id)));
  const kind = { module: S.mod, tier: S.tier, product: S.prod, credit_package: S.credit_packages };
  M.module_dependencies.forEach((d) => { need(kind[d.dependent_kind].has(d.dependent_id)); need(kind[d.requires_kind].has(d.requires_id)); });
  M.pricing_relationships.forEach((r) => { need(kind[r.subject_kind].has(r.subject)); if (r.related_to !== null) need(kind[r.related_to_kind].has(r.related_to)); });
  // deal configuration join keys
  C.product_selections.forEach((s) => {
    const p = S.prod.get(s.product_id); need(p);
    if (!p) return;
    need(p.o.tiers.some((t) => t.id === s.tier_id));
    if (s.commitment_plan_id !== null) need(p.o.commitment_plans.some((c) => c.id === s.commitment_plan_id));
    s.module_selections.forEach((m) => need(p.o.modules.some((x) => x.id === m.module_id)));
    s.quantities.forEach((q) => need(ct(q.credit_type_id)));
    s.credit_package_selections.forEach((k) => need(S.credit_packages.has(k.credit_package_id)));
  });
  C.bundle_selections.forEach((b) => need(S.bundles.has(b.bundle_id)));
  C.discount_selections.forEach((d) => need(S.discounts.has(d.discount_id)));
  return bad;
}
module.exports = { checkRefs };
