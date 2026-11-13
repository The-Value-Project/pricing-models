'use strict';
// Helpers shared by the phase 3 steps and the later phases: adjustment records, override list, ineligible handling.
const D = require('./dec');

const overrides = (S) => (S.C.negotiated_overrides ? S.C.negotiated_overrides.price_overrides : []);
function addAdj(S, type, amt, applies, source, desc, rec) {
  if (D.isZero(amt)) return;
  S.adjs.push({ type, amt, applies, source, desc, rec: rec === undefined ? amt : rec });
}
const lineRef = (l) => 'line:' + l.id;
// Multiply a line's running amount by (1 + pct/100) and record the difference.
function applyPct(S, l, pct, type, source, desc) {
  const before = l.run; l.run = D.mul(l.run, D.add(1, D.div(pct, 100)));
  const d = D.sub(l.run, before); addAdj(S, type, d, lineRef(l), source, desc, l.recurring ? d : D.ZERO);
}
// A selected object that does not apply (ineligible or bundle not fully matched).
function dropped(S) {
  if (S.policy.ineligible_selection_handling === 'error') S.err('ineligible_selection'); else S.warn('ineligible_selection', 'warning');
}
module.exports = { overrides, addAdj, lineRef, applyPct, dropped };
