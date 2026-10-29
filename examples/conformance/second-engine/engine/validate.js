'use strict';
// Phase 0 checks that need no prices: region (4.7), dependencies and relationships (7.1 steps 4-6), rules, consumption rules, overrides (7.4).
const { isCountry } = require('./ctx');

const NOT_MODELED = ['bundle_discount', 'volume_across_products', 'credit_sharing', 'entitlement_pooling'];
const VALID = {
  module: ['fixed_price', 'custom_unit_price', 'waived', 'discount_percentage', 'discount_amount', 'capped'],
  credit_package: ['fixed_price', 'custom_unit_price', 'waived', 'discount_percentage', 'discount_amount', 'capped'],
  credit_type_overage: ['custom_unit_price', 'waived'],
  total_deal: ['discount_percentage', 'discount_amount', 'capped', 'fixed_price'],
};
// Is the object of this kind selected or charged in the deal?
function present(S, sels, kind, id) {
  if (kind === 'module') return sels.some((X) => X.mods.some(({ m }) => m.id === id));
  if (kind === 'tier') return S.C.product_selections.some((s) => s.tier_id === id);
  if (kind === 'product') return S.C.product_selections.some((s) => s.product_id === id);
  return S.C.product_selections.some((s) => s.credit_package_selections.some((k) => k.credit_package_id === id));
}
function overrideOk(S, o, lines) {
  if (!(VALID[o.target_kind] || []).includes(o.override_type)) return false;
  if (o.override_value === null && o.override_type !== 'waived') return false;
  if (o.target_kind === 'module') return lines.some((l) => l.kind === 'module' && l.target_id === o.target_id);
  if (o.target_kind === 'credit_package') return lines.some((l) => l.kind === 'package' && l.target_id === o.target_id);
  if (o.target_kind === 'credit_type_overage') {
    const c = S.credit_types.get(o.target_id);
    return !!c && !(o.override_type === 'custom_unit_price' && !c.o.overage_price);
  }
  return true;
}
function validate(S, sels, lines) {
  const M = S.M, C = S.C;
  if (S.region !== null && !isCountry(S.region)) S.err('unknown_region');
  M.module_dependencies.forEach((d) => { if (present(S, sels, d.dependent_kind, d.dependent_id) && !present(S, sels, d.requires_kind, d.requires_id)) S.err('dependency_unmet'); });
  M.pricing_relationships.forEach((r) => {
    const has = present(S, sels, r.subject_kind, r.subject), other = r.related_to !== null && present(S, sels, r.related_to_kind, r.related_to);
    if (r.relationship_type === 'prerequisite' && has && r.related_to !== null && !other) S.err('dependency_unmet');
    if (r.relationship_type === 'mutual_exclusion' && has && other) S.err('mutual_exclusion');
    if (NOT_MODELED.includes(r.relationship_type)) S.warn('relationship_not_modeled', 'warning', 'relationship ' + r.id);
  });
  if (M.business_rules.length) S.warn('unevaluated_rule', 'info', 'rules not evaluated: ' + M.business_rules.map((r) => r.id).join(', '));
  M.credit_types.forEach((c) => { if (c.consumption_rules.some((r) => r.conditions !== null)) S.warn('consumption_conditions_ignored', 'info', 'credit type ' + c.id); });
  const no = C.negotiated_overrides;
  if (no) no.price_overrides = no.price_overrides.filter((o) => overrideOk(S, o, lines) || (S.err('invalid_override'), false));
}
module.exports = { validate };
