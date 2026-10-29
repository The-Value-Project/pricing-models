'use strict';
// Entitlement pools (7.6): base grants, variant grants, package units, grant overrides.
const D = require('./dec');

const UNL = 'unlimited';
const isUnknown = (g) => g.renewal_behavior === 'unknown' || g.period === 'unknown' || g.metric_type === 'unknown';
function addTo(S, pools, g, qty, unknown) {
  const key = [g.credit_type_id, g.period, g.metric_type].join('|');
  const hit = !unknown && pools.find((p) => !p.unknown && p.key === key);
  if (hit) {
    if (hit.renewal !== null && g.renewal_behavior !== null && hit.renewal !== g.renewal_behavior) S.err('renewal_mismatch');
    hit.qty = hit.qty === UNL || qty === UNL ? UNL : D.add(hit.qty, qty);
  } else pools.push({ key, ct: g.credit_type_id, period: g.period, metric: g.metric_type, renewal: g.renewal_behavior, qty, unknown });
}
const gq = (g) => (D.eq(g.quantity, -1) ? UNL : g.quantity);
function selGrants(S, X) {
  const gs = [];
  X.mods.forEach(({ m }) => gs.push(...m.included_credit_grants));
  gs.push(...X.tier.included_credit_grants);
  if (X.plan && X.planOk) gs.push(...X.plan.o.included_credit_grants);
  return gs;
}
function buildPools(S, sels) {
  const pools = []; S.indet = new Set();
  sels.forEach((X) => { X.grants = selGrants(S, X); X.grants.forEach((g) => addTo(S, pools, g, gq(g), isUnknown(g))); });
  S.bundlesApplied.forEach((be) => be.o.included_credit_grants.forEach((g) => addTo(S, pools, g, gq(g), isUnknown(g))));
  const vg = S.variant ? S.variant.overrides.included_credit_grants : [];
  let out = pools.filter((p) => !vg.some((g) => g.credit_type_id === p.ct && g.period === p.period));
  vg.forEach((g) => addTo(S, out, g, gq(g), isUnknown(g)));
  sels.forEach((X) => X.sel.credit_package_selections.forEach((k) => {
    const pk = S.credit_packages.get(k.credit_package_id).o;
    const g = { credit_type_id: pk.credit_type_id, period: 'one_time', metric_type: 'consumable', renewal_behavior: null };
    if (pk.rollover_policy === 'unknown') S.indet.add(pk.credit_type_id);
    addTo(S, out, g, D.mul(pk.quantity, k.quantity), false);
  }));
  const ovs = S.C.negotiated_overrides ? S.C.negotiated_overrides.credit_grant_overrides : [];
  ovs.forEach((o) => {
    const hit = out.filter((p) => p.ct === o.credit_type_id && p.period === o.period);
    if (!hit.length) S.err('invalid_override');
    hit.forEach((p) => { p.qty = D.eq(o.new_quantity, -1) ? UNL : o.new_quantity; });
  });
  return out;
}
// Overage of a pool in a year given demand d.
const poolOverage = (p, d) => (p.qty === UNL || D.le(d, p.qty) ? D.ZERO : D.sub(d, p.qty));
module.exports = { buildPools, poolOverage, UNL };
