'use strict';
// Phase 4: module and credit-package line items at the price after phases 1-2 (7.5).
const D = require('./dec');
const P = require('./price');
const { billed, qtyYear } = require('./ctx');

// Charge for the contract of price p; qtyAt(j) gives the quantity of billing period j. Null when the term does not fit.
function contractCharge(S, p, qtyAt) {
  if (!P.bandsWellFormed(p) || (p.type === 'tiered' && !p.tiers) || (p.type === 'volume' && !p.breakpoints)) { S.err('malformed_bands'); return null; }
  const n = P.periodCount(p, S.term);
  if (n === null) { S.err('term_not_multiple_of_period'); return null; }
  if (P.unpriced(p)) { S.warn('unpriced_item', 'warning'); return { total: D.ZERO, n }; }
  let t = D.ZERO;
  for (let j = 1; j <= n; j++) t = D.add(t, P.charge(p, qtyAt(j)));
  return { total: t, n };
}
function mkLine(S, o) {
  const { price: p, cur } = o.pr;
  if (cur !== S.currency) S.err('mixed_currency');
  const c = contractCharge(S, p, o.qtyAt);
  if (!c) return null;
  const q1 = o.qtyAt(1);
  const first = p.type === 'flat' ? null : o.qtyAt(1);
  const up = p.type === 'flat' || p.type === 'per_unit' ? p.amount : (p.type === 'tiered' ? p.tiers : p.breakpoints)[0].value;
  const sf = [o.pr.ptr]; if (o.qptr) sf.push(o.qptr);
  return { category: p.period === 'one_time' && o.kind !== 'overage' ? 'one_time_fee' : o.cat, kind: o.kind, recurring: p.period !== 'one_time' || o.kind === 'overage', product_id: o.product_id, target_id: o.target_id,
    description: o.label, quantity: p.type === 'flat' ? D.num(1n) : q1, unit: p.unit || 'unit', unit_price: up === null ? D.ZERO : up, graduated_detail: first === null ? null : P.detail(p, first),
    computation_method: p.type, source_fields: sf, price: p, base: c.total, run: c.total, n: c.n, qtyAt: o.qtyAt, sel: o.sel, tierVia: o.viaTier, mod: o.mod, adj: [] };
}
function buildLines(S, sels) {
  const lines = [];
  for (const X of sels) {
    for (const { m, viaTier } of X.mods) {
      const pr = S.priceOf('module', m.id), p = pr.price; let qtyAt = () => D.ZERO, qptr = null;
      if (p.type !== 'flat') {
        const b = billed(X.sel, p.credit_type_id);
        if (!b) { S.err('missing_quantity'); continue; }
        qtyAt = (j) => qtyYear(b.e, p.period === 'one_time' ? 1 : P.yearOfPeriod(p, j)); qptr = `config#/product_selections/${X.i}/quantities/${b.i}`;
      }
      const l = mkLine(S, { pr, qtyAt, qptr, cat: 'module_charge', kind: 'module', product_id: X.prod.id, target_id: m.id, label: m.label, sel: X, viaTier, mod: m });
      if (l) lines.push(l);
    }
    X.sel.credit_package_selections.forEach((k, ki) => {
      const pk = S.credit_packages.get(k.credit_package_id).o, pr = S.priceOf('package', pk.id);
      const l = mkLine(S, { pr, qtyAt: () => k.quantity, qptr: pr.price.type === 'flat' ? null : `config#/product_selections/${X.i}/credit_package_selections/${ki}`,
        cat: 'credit_package', kind: 'package', product_id: X.prod.id, target_id: pk.id, label: pk.label, sel: X, viaTier: false, mod: null });
      if (l) { l.pkg = pk; lines.push(l); }
    });
  }
  return lines;
}
module.exports = { buildLines, contractCharge, mkLine };
