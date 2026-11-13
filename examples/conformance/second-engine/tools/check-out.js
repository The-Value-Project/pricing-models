'use strict';
// Minimal JSON Schema check of out/<id>.json statements against schemas/invoice_statement.json.
const fs = require('fs');
const path = require('path');
const B = path.join(__dirname, '..');
const root = JSON.parse(fs.readFileSync(path.join(B, '..', '..', '..', 'schemas', 'invoice_statement.json'), 'utf8'));
const ref = (r) => r.slice(2).split('/').reduce((o, k) => o[k], root);
const tname = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
function check(s, v, p, errs) {
  if (s.$ref) return check(ref(s.$ref), v, p, errs);
  if (s.allOf) s.allOf.forEach((x) => check(x, v, p, errs));
  if (s.anyOf && !s.anyOf.some((x) => { const e = []; check(x, v, p, e); return !e.length; })) errs.push(p + ': anyOf');
  if (s.type) {
    const ts = [].concat(s.type), t = tname(v);
    if (!ts.includes(t) && !(t === 'integer' && ts.includes('number'))) { errs.push(`${p}: type ${t} not ${ts}`); return; }
  }
  if (s.const !== undefined && v !== s.const) errs.push(`${p}: const`);
  if (s.enum && !s.enum.includes(v)) errs.push(`${p}: enum ${v}`);
  if (s.pattern && typeof v === 'string' && !new RegExp(s.pattern).test(v)) errs.push(`${p}: pattern ${v}`);
  if (s.minimum !== undefined && typeof v === 'number' && v < s.minimum) errs.push(`${p}: minimum`);
  if (Array.isArray(v) && s.items) v.forEach((x, i) => check(s.items, x, `${p}/${i}`, errs));
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    (s.required || []).forEach((k) => { if (!(k in v)) errs.push(`${p}: missing ${k}`); });
    for (const k of Object.keys(v)) {
      if (s.properties && s.properties[k]) check(s.properties[k], v[k], `${p}/${k}`, errs);
      else if (s.additionalProperties === false) errs.push(`${p}: extra ${k}`);
    }
  }
}
let bad = 0, n = 0;
for (const f of fs.readdirSync(path.join(B, 'out')).sort()) {
  const o = JSON.parse(fs.readFileSync(path.join(B, 'out', f), 'utf8')); n++;
  if (o.outcome !== 'statement') continue;
  const errs = []; check(root, o.statement, '', errs);
  if (errs.length) { bad++; console.log(f, errs.slice(0, 4).join(' | ')); }
}
console.log(`${n} outputs, ${bad} statements with schema errors`);
