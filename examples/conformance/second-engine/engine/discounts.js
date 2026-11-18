'use strict';
// Phase 6: model discounts (stacking, exclusive groups, values, scopes), negotiated discounts, whole-deal overrides (7.7).
const D = require('./dec');
const { eligible, inList } = require('./ctx');
const { strategyValue } = require('./disc');
const { addAdj, overrides, dropped } = require('./adj');

// Reduce lines by `total` (flat), spread in proportion to running amounts; returns per-line reductions.
function spread(lines, total) {
  const sum = D.sum(lines.map((l) => l.run));
  if (D.isZero(sum)) return lines.map((l, i) => (i === 0 ? total : D.ZERO));
  return lines.map((l) => D.mul(total, D.div(l.run, sum)));
}
const label = (S, ls, f, fallback) => { const s = new Set(ls.map(f)); return s.size === 1 ? [...s][0] : fallback; };
function reduce(S, ls, reds, type, source, desc, applies) {
  ls.forEach((l, i) => { l.run = D.sub(l.run, reds[i]); });
  const tot = D.neg(D.sum(reds)), rec = D.neg(D.sum(reds.filter((r, i) => ls[i].recurring)));
  addAdj(S, type, tot, applies, source, desc, rec);
}
function baseLines(lines, d) {
  const t = d.targets || { module_ids: [], product_ids: [], credit_type_ids: [] };
  if (d.scope === 'module') return lines.filter((l) => l.kind === 'module' && inList(t.module_ids, l.target_id));
  if (d.scope === 'product') return lines.filter((l) => l.kind === 'module' && inList(t.product_ids, l.product_id));
  if (d.scope === 'credits_only') return lines.filter((l) => l.kind === 'package' && inList(t.credit_type_ids, l.pkg.credit_type_id));
  return lines.filter((l) => l.recurring || (l.kind === 'module' && t.module_ids.includes(l.target_id)));
}
function appliesTo(d, ls) {
  const f = d.scope === 'module' ? (l) => 'line:' + l.id : d.scope === 'product' ? (l) => 'product:' + l.product_id : d.scope === 'credits_only' ? (l) => 'credit_type:' + l.pkg.credit_type_id : () => 'contract_total';
  return label(null, ls, f, 'contract_total');
}
// Value of a discount, or null when it cannot be computed; reports validation failures and warnings.
function valueOf(S, d, sel) {
  if (d.mode === 'manual') {
    const v = sel ? sel.manual_value : null, m = d.manual || { max_value: null, approval_required_over: null };
    if (v === null) { S.err('missing_manual_value'); return null; }
    if (m.max_value !== null && D.gt(v, m.max_value)) S.err('manual_value_exceeds_max');
    if (m.approval_required_over !== null && D.gt(v, m.approval_required_over)) S.warn('approval_required', 'warning');
    return v;
  }
  let v = strategyValue(S, S.discount_strategies.get(d.strategy.strategy_id).o);
  if (v === null) {
    if (S.policy.missing_strategy_inputs_handling === 'error') { S.err('missing_strategy_input'); return null; }
    S.warn('missing_strategy_input', 'warning'); v = D.ZERO;
  }
  const c = d.strategy.caps; if (!c) return v;
  const [cap, ap] = d.type === 'percentage' ? [c.max_percent, c.approval_required_over_percent] : [c.max_amount, c.approval_required_over_amount];
  if (cap !== null) v = D.min(v, cap);
  if (ap !== null && D.gt(v, ap)) S.warn('approval_required', 'warning');
  return v;
}
function flatCap(S, ls, v) {
  const base = D.sum(ls.map((l) => l.run)); if (D.gt(v, base)) { S.warn('discount_exceeds_base', 'warning'); return base; } return v;
}
function plan(S, d, lines, sel, quiet) {
  const ls = baseLines(lines, d), v = valueOf(S, d, sel);
  if (v === null) return { ls, reds: ls.map(() => D.ZERO), tot: D.ZERO };
  const reds = d.type === 'percentage' ? ls.map((l) => D.mul(l.run, D.div(v, 100))) : spread(ls, quiet ? v : flatCap(S, ls, v));
  return { ls, reds, tot: D.sum(reds) };
}
function modelDiscounts(S, lines) {
  const sels = S.C.discount_selections, order = S.rules.discount_application_order || [], app = new Map();
  S.M.discounts.forEach((d, i) => {
    if (d.mode === 'manual' && d.discretion === 'mandatory') S.err('invalid_discount');
    const ov = S.variant && S.variant.overrides.discount_eligibility_overrides.find((x) => x.discount_id === d.id);
    const ok = ov ? ov.enabled : eligible(S, d.eligibility), sel = sels.find((x) => x.discount_id === d.id);
    if (d.discretion === 'mandatory' ? ok && d.mode !== 'manual' : sel && ok) app.set(d.id, { d, i, sel });
    else if (sel) dropped(S);
  });
  for (const id of app.keys()) if (!order.includes(id)) S.err('discount_not_ordered');
  const done = new Set(); let applied = 0;
  for (const id of order) {
    let e = app.get(id); if (!e || done.has(id)) continue;
    const g = e.d.stacking && e.d.stacking.exclusive_group;
    if (g) {
      const mem = order.filter((x) => app.has(x) && app.get(x).d.stacking && app.get(x).d.stacking.exclusive_group === g);
      mem.forEach((x) => done.add(x));
      if (S.policy.exclusive_group_resolution === 'max_discount') {
        let best = null; const e0 = S.errs.length, w0 = S.warns.length;
        mem.forEach((x) => { const t = plan(S, app.get(x).d, lines, app.get(x).sel, true).tot; if (!best || D.gt(t, best.t)) best = { t, x }; });
        S.errs.length = e0; S.warns.length = w0;
        e = app.get(best.x);
      } else e = app.get(mem[0]);
    } else if (e.d.stacking && !e.d.stacking.stackable && applied) continue;
    const p = plan(S, e.d, lines, e.sel, false); applied++;
    reduce(S, p.ls, p.reds, e.d.mode === 'strategy' ? 'strategy_discount' : 'other', `model#/discounts/${e.i}`, e.d.label, appliesTo(e.d, p.ls));
  }
}
// Negotiated discounts, caps and whole-deal overrides.
function negotiated(S, lines) {
  const ovs = overrides(S);
  const run = (ls, o, i, ref) => {
    const v = o.override_value, tot = D.sum(ls.map((l) => l.run)); let red;
    if (o.override_type === 'discount_percentage') red = D.mul(tot, D.div(v, 100));
    else if (o.override_type === 'discount_amount') red = flatCap(S, ls, v);
    else if (o.override_type === 'capped') red = D.gt(tot, v) ? D.sub(tot, v) : D.ZERO;
    else red = D.sub(tot, v);
    const type = { discount_percentage: 'negotiated_discount_percentage', discount_amount: 'negotiated_discount_amount', capped: 'price_cap', fixed_price: 'negotiated_fixed_price' }[o.override_type];
    reduce(S, ls, spread(ls, red), type, `config#/negotiated_overrides/price_overrides/${i}`, o.description, ref);
  };
  ovs.forEach((o, i) => {
    if (!['discount_percentage', 'discount_amount', 'capped'].includes(o.override_type) || !['module', 'credit_package'].includes(o.target_kind)) return;
    const ls = lines.filter((l) => l.target_id === o.target_id && l.kind === (o.target_kind === 'module' ? 'module' : 'package'));
    if (ls.length) run(ls, o, i, label(S, ls, (l) => 'line:' + l.id, 'contract_total'));
  });
  ovs.forEach((o, i) => {
    if (o.target_kind !== 'total_deal') return;
    if (!['discount_percentage', 'discount_amount', 'capped', 'fixed_price'].includes(o.override_type) || o.override_value === null) { S.err('invalid_override'); return; }
    run(lines, o, i, 'contract_total');
  });
}
function phase6(S, lines) { modelDiscounts(S, lines); negotiated(S, lines); }
module.exports = { phase6 };
