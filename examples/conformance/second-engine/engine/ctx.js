'use strict';
// Shared context: indexes, error/warning collectors, quantities (4.2), eligibility (7.1), metrics (4.6).
const D = require('./dec');
const EU = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' ');
const GROUPS = { EU, EEA: [...EU, 'IS', 'LI', 'NO'] };
const BILLED = ['committed', 'estimated', 'starting'];

function index(arr, key = 'id') {
  const m = new Map(); (arr || []).forEach((o, i) => { if (!m.has(o[key])) m.set(o[key], { o, i }); }); return m;
}
function build(M, C) {
  const S = { M, C, errs: [], warns: [], adjs: [], lines: null };
  S.err = (c) => { if (!S.errs.includes(c)) S.errs.push(c); };
  S.warn = (type, severity, message) => { if (!S.warns.some((w) => w.type === type && w.message === (message || type))) S.warns.push({ type, message: message || type, severity }); };
  S.term = Number(D.num(C.billing.contract_term_months).n);
  S.years = Math.max(1, Math.ceil(S.term / 12));
  S.region = C.customer.region; S.motion = C.deal_motion;
  S.rules = M.pricing_rules || {};
  S.policy = S.rules.policy || { exclusive_group_resolution: 'max_discount', ineligible_selection_handling: 'error', missing_strategy_inputs_handling: 'error' };
  S.prod = index(M.products); S.mod = new Map(); S.tier = new Map(); S.plan = new Map();
  M.products.forEach((p, pi) => {
    p.modules.forEach((o, mi) => { if (!S.mod.has(o.id)) S.mod.set(o.id, { o, pi, i: mi, prod: p }); });
    p.tiers.forEach((o, ti) => { if (!S.tier.has(o.id)) S.tier.set(o.id, { o, pi, i: ti, prod: p }); });
    p.commitment_plans.forEach((o, ci) => { if (!S.plan.has(o.id)) S.plan.set(o.id, { o, pi, i: ci, prod: p }); });
  });
  for (const k of ['bundles', 'discounts', 'credit_types', 'credit_packages', 'discount_strategies', 'price_books', 'variants', 'minimum_commitments']) S[k] = index(M[k]);
  return S;
}
// Billed (non-maximum) entry for a credit type in a selection, with its index; duplicates reported by validation.
function billed(sel, ct) {
  const i = sel.quantities.findIndex((q) => q.credit_type_id === ct && BILLED.includes(q.quantity_type));
  return i < 0 ? null : { e: sel.quantities[i], i };
}
// Quantity of a billed entry in contract year y (4.2).
function qtyYear(e, y) {
  const g = e.growth_schedule && e.growth_schedule.find((x) => D.eq(x.period_index, y));
  return g ? g.quantity : e.quantity;
}
function regionIn(list) {
  return !!S_region && list.some((r) => r === S_region || (GROUPS[r] || []).includes(S_region));
}
let S_region = null;
function metric(S, name) {
  if (S.credit_types.has(name)) return D.sum(S.C.product_selections.map((s) => { const b = billed(s, name); return b ? qtyYear(b.e, 1) : D.ZERO; }));
  if (name === 'contract_term_months') return D.num(BigInt(S.term));
  if (name === 'gross_annual_recurring' && S.lines) {
    const rec = S.lines.filter((l) => l.recurring);
    return D.div(D.sum(rec.map((l) => l.base)), D.div(BigInt(S.term), 12n));
  }
  return null;
}
// Eligibility (7.1 step 3): true when the object may apply.
function eligible(S, el) {
  if (!el) return true;
  S_region = S.region;
  if (el.deal_motions.length && !el.deal_motions.includes(S.motion)) return false;
  if (el.regions.length && !regionIn(el.regions)) return false;
  if (el.min_metric) { const v = metric(S, el.min_metric.metric); if (v === null || D.lt(v, el.min_metric.min)) return false; }
  return true;
}
const isCountry = (r) => /^[A-Z]{2}$/.test(r) || !!GROUPS[r];
// Unrestricted-empty-array matching (3.3).
const inList = (list, id) => !list || list.length === 0 || list.includes(id);
module.exports = { build, billed, qtyYear, eligible, metric, isCountry, inList, index, BILLED, GROUPS };
