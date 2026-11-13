'use strict';
// Phase 3c: negotiated price replacements (7.4 step 3).
const D = require('./dec');
const { contractCharge } = require('./lines');
const { addAdj, lineRef } = require('./adj');

const REPLACEMENTS = ['fixed_price', 'custom_unit_price', 'waived'];
// Replace a line's running amount per a replacement override; ref is the applies_to label.
function replace(S, l, ov, idx, ref) {
  const before = l.run, p = l.price;
  let nr = D.ZERO;
  if (ov.override_type === 'fixed_price') nr = D.mul(ov.override_value, BigInt(l.n));
  if (ov.override_type === 'custom_unit_price') {
    const c = contractCharge(S, { type: 'per_unit', period: p.period, amount: ov.override_value, tiers: null, breakpoints: null }, l.qtyAt);
    nr = c ? c.total : D.ZERO;
  }
  l.run = nr; const d = D.sub(nr, before);
  addAdj(S, ov.override_type === 'waived' ? 'waived_fee' : 'negotiated_fixed_price', d, ref, `config#/negotiated_overrides/price_overrides/${idx}`, ov.description, l.recurring ? d : D.ZERO);
}
// Applies the line's replacement overrides; returns true when the line was replaced (no plan or bundle then).
function applyReplacements(S, l, ovs) {
  const mine = ovs.map((o, i) => [o, i]).filter(([o]) => o.target_id === l.target_id && ((o.target_kind === 'module' && l.kind === 'module') || (o.target_kind === 'credit_package' && l.kind === 'package'))
    && REPLACEMENTS.includes(o.override_type));
  if (!mine.length) return false;
  l.replaced = true; mine.forEach(([o, i]) => replace(S, l, o, i, lineRef(l)));
  return true;
}
module.exports = { replace, applyReplacements };
