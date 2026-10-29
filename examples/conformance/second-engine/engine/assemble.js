'use strict';
// Phase 8: rounding, totals and the InvoiceStatement (9).
const D = require('./dec');

function endDate(start, months) {
  const [y, m, d] = start.split('-').map(Number), dt = new Date(Date.UTC(y, m - 1 + months, d));
  if (dt.getUTCDate() !== d) dt.setUTCDate(0);
  dt.setUTCDate(dt.getUTCDate() - 1); return dt.toISOString().slice(0, 10);
}
function assemble(S, lines, summary) {
  const r = S.rules.rounding, places = r && r.mode === 'currency_minor_units' ? Number(D.num(r.currency_minor_units).n) : null;
  const rnd = (x) => (places === null ? x : D.round(x, places));
  const items = lines.map((l) => ({ line_id: l.id, category: l.category, description: l.description, product_id: l.product_id, target_id: l.target_id,
    quantity: l.quantity, unit: l.unit, unit_price: l.unit_price, line_total: rnd(l.base), graduated_detail: l.graduated_detail, computation_method: l.computation_method, source_fields: l.source_fields }));
  const adjustments = S.adjs.map((a) => ({ adjustment_type: a.type, description: a.desc || a.type, amount: rnd(a.amt), applies_to: a.applies, computation_method: 'exact decimal', source: a.source }));
  const sum = (ls, f) => D.sum(ls.map(f));
  const rec = sum(lines.map((l, i) => [l, items[i]]).filter(([l]) => l.recurring), ([, it]) => it.line_total);
  const one = sum(lines.map((l, i) => [l, items[i]]).filter(([l]) => !l.recurring), ([, it]) => it.line_total);
  const gross = D.add(rec, one), tadj = sum(adjustments, (a) => a.amount), net = D.add(gross, tadj);
  const recNet = D.add(rec, sum(S.adjs, (a) => (D.eq(a.rec, a.amt) ? rnd(a.amt) : rnd(a.rec))));
  const annual = rnd(D.div(recNet, D.div(BigInt(S.term), 12n)));
  const b = S.C.billing;
  return { schema_version: '2.0.0', invoice_id: 'inv-' + S.C.config_id, config_id: S.C.config_id, model_id: S.M.model_id,
    period: { label: 'Contract total', start_date: b.contract_start_date, end_date: endDate(b.contract_start_date, S.term), period_type: 'contract_total' },
    currency: S.currency, line_items: items, subtotals: { recurring: rec, one_time: one, gross }, adjustments,
    totals: { total_adjustments: tadj, net_total: net, annualized_total: annual, total_contract_value: net },
    entitlement_summary: summary.map((e) => ({ ...e, overage_cost: e.overage_cost === null ? null : rnd(e.overage_cost) })), warnings: S.warns, computation_notes: [] };
}
module.exports = { assemble };
