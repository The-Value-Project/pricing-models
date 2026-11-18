'use strict';
// Phase 7: true-ups to minimum commitments (7.8).
const D = require('./dec');
const { eligible, inList } = require('./ctx');
const { addAdj } = require('./adj');

function minimums(S, lines) {
  const tu = [], yrs = D.div(BigInt(S.term), 12n);
  S.M.minimum_commitments.forEach((m, mi) => {
    if (!eligible(S, m.eligibility)) return;
    if (m.currency !== S.currency) { S.err('mixed_currency'); return; }
    const t = m.targets || { product_ids: [], credit_type_ids: [] }, sc = m.scope;
    const ctOf = (l) => (l.kind === 'package' ? l.pkg.credit_type_id : l.kind === 'overage' ? l.target_id : null);
    const inCredits = (l) => ctOf(l) !== null && inList(t.credit_type_ids, ctOf(l));
    const sumRun = (f) => D.sum(lines.filter(f).map((l) => l.run));
    const overlap = (a, b) => !a.length || !b.length || a.some((x) => b.includes(x));
    let net, pids = [], cts = [];
    if (sc === 'contract_total') net = D.add(sumRun(() => true), D.sum(tu.map((u) => u.amt)));
    else if (sc === 'annual') net = D.div(D.add(sumRun((l) => l.recurring), D.sum(tu.map((u) => u.amt))), yrs);
    else if (sc === 'credits_only') {
      cts = t.credit_type_ids; net = D.add(sumRun(inCredits), D.sum(tu.filter((u) => u.scope === sc && overlap(u.cts, cts)).map((u) => u.amt)));
    } else {
      pids = t.product_ids; net = D.add(sumRun((l) => l.product_id !== null && inList(pids, l.product_id)), D.sum(tu.filter((u) => u.scope === sc && overlap(u.pids, pids)).map((u) => u.amt)));
    }
    let short = D.sub(m.amount, net); if (!D.gt(short, 0)) return;
    if (sc === 'annual') short = D.mul(short, yrs);
    tu.push({ scope: sc, amt: short, pids, cts });
    const ap = sc === 'product' && pids.length ? 'product:' + pids[0] : sc === 'credits_only' && cts.length ? 'credit_type:' + cts[0] : 'contract_total';
    addAdj(S, 'minimum_true_up', short, ap, `model#/minimum_commitments/${mi}`, m.label, short);
  });
}
module.exports = { minimums };
