'use strict';
// JSON parser that keeps numbers as exact Rats (parsed from their text) and writer that prints Rats as numbers.
const D = require('./dec');
function parse(text) {
  let i = 0;
  const ws = () => { while (i < text.length && ' \t\r\n'.includes(text[i])) i++; };
  const fail = (m) => { throw new Error('JSON ' + m + ' at ' + i); };
  function value() {
    ws(); const c = text[i];
    if (c === '{') { i++; const o = {}; ws(); if (text[i] === '}') { i++; return o; }
      for (;;) { ws(); const k = str(); ws(); if (text[i++] !== ':') fail('colon'); o[k] = value(); ws();
        if (text[i] === ',') { i++; continue; } if (text[i++] === '}') return o; fail('object'); } }
    if (c === '[') { i++; const a = []; ws(); if (text[i] === ']') { i++; return a; }
      for (;;) { a.push(value()); ws(); if (text[i] === ',') { i++; continue; } if (text[i++] === ']') return a; fail('array'); } }
    if (c === '"') return str();
    for (const [w, v] of [['true', true], ['false', false], ['null', null]]) if (text.startsWith(w, i)) { i += w.length; return v; }
    const m = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i, i + 80));
    if (!m) fail('value'); i += m[0].length; return D.fromStr(m[0]);
  }
  function str() {
    if (text[i] !== '"') fail('string'); let j = i + 1;
    while (text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
    const s = JSON.parse(text.slice(i, j + 1)); i = j + 1; return s;
  }
  const v = value(); ws(); if (i !== text.length) fail('trailing'); return v;
}
function write(v) {
  if (D.isRat(v)) return D.fmt(v);
  if (Array.isArray(v)) return '[' + v.map(write).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + write(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
module.exports = { parse, write };
