'use strict';
// Price primitives (spec section 5): bands, periods, charge for one billing period.
const D = require('./dec');
const MONTHS = { month: 1n, quarter: 3n, year: 12n };
const bandsOf = (p) => (p.type === 'tiered' ? p.tiers : p.type === 'volume' ? p.breakpoints : null);

// Bands must be contiguous from 0 to unbounded (5.2). Only tiered/volume prices carry bands.
function bandsWellFormed(p) {
  const b = bandsOf(p); if (!b) return true;
  if (!b.length || !D.isZero(b[0].min)) return false;
  for (let i = 0; i < b.length; i++) {
    const last = i === b.length - 1;
    if (last ? b[i].max !== null : b[i].max === null || !D.eq(b[i].max, b[i + 1].min)) return false;
  }
  return true;
}
// Number of billing periods in the term, or null when the term is not a whole number of periods (3.8).
function periodCount(p, term) {
  if (p.period === 'one_time') return 1;
  const m = MONTHS[p.period]; return BigInt(term) % m === 0n ? Number(BigInt(term) / m) : null;
}
// Contract year (from 1) in which billing period j (from 1) starts (4.2).
const yearOfPeriod = (p, j) => (p.period === 'one_time' ? 1 : Number(((BigInt(j) - 1n) * MONTHS[p.period]) / 12n) + 1);

// Graduated detail for a tiered price: the part of q inside each band.
function inBand(q, band) {
  const top = band.max === null ? q : D.min(q, band.max);
  return D.gt(top, band.min) ? D.sub(top, band.min) : D.ZERO;
}
// Charge in one billing period at quantity q (5.1); null amount on flat/per_unit is unpriced (5.3).
function charge(p, q) {
  if (p.type === 'flat') return p.amount === null ? D.ZERO : p.amount;
  if (p.type === 'per_unit') return p.amount === null ? D.ZERO : D.mul(p.amount, q);
  if (p.type === 'tiered') return D.sum(p.tiers.map((b) => D.mul(inBand(q, b), b.value)));
  const b = p.breakpoints.find((x) => D.ge(q, x.min) && (x.max === null || D.lt(q, x.max)));
  return b ? D.mul(q, b.value) : D.ZERO;
}
const unpriced = (p) => (p.type === 'flat' || p.type === 'per_unit') && p.amount === null;
// A copy of the price with amount and every band value multiplied by f.
function scale(p, f) {
  const sc = (bs) => (bs ? bs.map((b) => ({ ...b, value: D.mul(b.value, f) })) : bs);
  return { ...p, amount: p.amount === null ? null : D.mul(p.amount, f), tiers: sc(p.tiers), breakpoints: sc(p.breakpoints) };
}
function detail(p, q) {
  if (p.type !== 'tiered') return null;
  return p.tiers.filter((b) => D.gt(inBand(q, b), 0)).map((b) => ({ band_label: D.fmt(b.min) + '-' + (b.max === null ? 'inf' : D.fmt(b.max)),
    quantity_in_band: inBand(q, b), unit_price: b.value, band_total: D.mul(inBand(q, b), b.value) }));
}
module.exports = { bandsWellFormed, periodCount, yearOfPeriod, charge, unpriced, scale, detail, MONTHS };
