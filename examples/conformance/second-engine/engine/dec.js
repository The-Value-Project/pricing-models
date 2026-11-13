'use strict';
// Exact rational arithmetic on BigInt. A Rat is {n, d} with d > 0, always reduced.
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
const mk = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g, rat: true }; };
const isRat = (x) => !!x && x.rat === true;
const num = (x) => (isRat(x) ? x : mk(BigInt(x)));
const add = (a, b) => { a = num(a); b = num(b); return mk(a.n * b.d + b.n * a.d, a.d * b.d); };
const sub = (a, b) => { a = num(a); b = num(b); return mk(a.n * b.d - b.n * a.d, a.d * b.d); };
const mul = (a, b) => { a = num(a); b = num(b); return mk(a.n * b.n, a.d * b.d); };
const div = (a, b) => { a = num(a); b = num(b); return mk(a.n * b.d, a.d * b.n); };
const neg = (a) => mk(-num(a).n, num(a).d);
const cmp = (a, b) => { a = num(a); b = num(b); const l = a.n * b.d, r = b.n * a.d; return l < r ? -1 : l > r ? 1 : 0; };
const lt = (a, b) => cmp(a, b) < 0;
const gt = (a, b) => cmp(a, b) > 0;
const le = (a, b) => cmp(a, b) <= 0;
const ge = (a, b) => cmp(a, b) >= 0;
const eq = (a, b) => cmp(a, b) === 0;
const isZero = (a) => num(a).n === 0n;
const min = (a, b) => (le(a, b) ? a : b);
const max = (a, b) => (ge(a, b) ? a : b);
const sum = (xs) => xs.reduce((s, x) => add(s, x), mk(0n));
const ZERO = mk(0n), ONE = mk(1n);
const isInt = (a) => num(a).d === 1n;
const floorInt = (a) => { a = num(a); let q = a.n / a.d; if (a.n < 0n && q * a.d !== a.n) q -= 1n; return q; };

function fromStr(s) {
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(s);
  if (!m) throw new Error('bad number ' + s);
  const frac = m[3] || '';
  let n = BigInt(m[2] + frac), d = 10n ** BigInt(frac.length);
  const e = m[4] ? parseInt(m[4], 10) : 0;
  if (e > 0) n *= 10n ** BigInt(e); else if (e < 0) d *= 10n ** BigInt(-e);
  return mk(m[1] ? -n : n, d);
}
// Scaled integer: round half away from zero to `places` decimals, as a signed BigInt count of 10^-places.
function scaled(a, places) {
  a = num(a); const neg_ = a.n < 0n; const an = (neg_ ? -a.n : a.n) * 10n ** BigInt(places);
  const q = (2n * an + a.d) / (2n * a.d);
  return neg_ ? -q : q;
}
const round = (a, places) => mk(scaled(a, places), 10n ** BigInt(places));
// Decimal text for a Rat (rounded to at most `places`, trailing zeros trimmed).
function fmt(a, places = 10) {
  const q = scaled(a, places); const neg_ = q < 0n; const an = neg_ ? -q : q; const p = 10n ** BigInt(places);
  const fp = (an % p).toString().padStart(places, '0').replace(/0+$/, '');
  return (neg_ ? '-' : '') + (an / p).toString() + (fp ? '.' + fp : '');
}
module.exports = { mk, isRat, num, add, sub, mul, div, neg, cmp, lt, gt, le, ge, eq, isZero, min, max, sum, ZERO, ONE, isInt, floorInt, fromStr, round, fmt };
