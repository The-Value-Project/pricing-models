'use strict';
// Phase 1 (variant) and phase 2 (price book): the price each module and package starts from.
const P = require('./price');
const { GROUPS } = require('./ctx');

function setup(S) {
  const M = S.M;
  if (M.variants.some((v, i) => M.variants.findIndex((w) => w.deal_motion === v.deal_motion) !== i)) S.err('multiple_variants_for_motion');
  const vi = M.variants.findIndex((v) => v.deal_motion === S.motion);
  S.variantIdx = vi; S.variant = vi < 0 ? null : M.variants[vi];
  const r = S.region;
  let bi = r ? M.price_books.findIndex((b) => b.region === r) : -1;
  if (r && bi < 0) {
    const hits = M.price_books.map((b, i) => [b, i]).filter(([b]) => (GROUPS[b.region] || []).includes(r));
    if (hits.length > 1) S.err('ambiguous_price_book');
    if (hits.length) bi = hits[0][1];
  }
  S.bookIdx = bi; S.book = bi < 0 ? null : M.price_books[bi];
  S.currency = S.book ? S.book.currency : M.currency;
  const memo = new Map();
  // kind: 'module' | 'package'. Returns { price, ptr, cur }.
  S.priceOf = (kind, id) => {
    const key = kind + ':' + id; if (memo.has(key)) return memo.get(key);
    const base = kind === 'module' ? S.mod.get(id) : S.credit_packages.get(id);
    const basePtr = kind === 'module' ? `model#/products/${base.pi}/modules/${base.i}/price` : `model#/credit_packages/${base.i}/price`;
    const idf = kind === 'module' ? 'module_id' : 'credit_package_id';
    const vl = kind === 'module' ? 'module_price_overrides' : 'credit_package_price_overrides';
    const bl = kind === 'module' ? 'module_prices' : 'credit_package_prices';
    let res = { price: base.o.price, ptr: basePtr, cur: base.o.price.currency || M.currency, variant: false };
    const vo = S.variant && S.variant.overrides[vl].findIndex((x) => x[idf] === id);
    if (vo >= 0 && S.variant) {
      const p = S.variant.overrides[vl][vo].price;
      res = { price: p, ptr: `model#/variants/${S.variantIdx}/overrides/${vl}/${vo}/price`, cur: p.currency || M.currency, variant: true };
    } else if (S.book) {
      const be = S.book[bl].findIndex((x) => x[idf] === id);
      if (be >= 0) { const p = S.book[bl][be].price; res = { price: p, ptr: `model#/price_books/${S.bookIdx}/${bl}/${be}/price`, cur: p.currency || S.book.currency, variant: false }; }
      else if (S.book.fallback_multiplier !== null) res = { price: P.scale(res.price, S.book.fallback_multiplier), ptr: basePtr, cur: S.book.currency, variant: false };
    }
    memo.set(key, res); return res;
  };
}
module.exports = { setup };
