#!/usr/bin/env python3
"""Checks the schemas, the conformance vectors, the worked example and the second engine.

  python examples/conformance/tools/check.py                 run every check (what CI runs)
  python examples/conformance/tools/check.py --compare DIR   compare any engine's outputs with the expected results

For --compare, DIR holds one <vector-id>.json per vector, each either
  {"outcome": "statement", "statement": {...an InvoiceStatement...}}   or
  {"outcome": "validation_failure", "codes": ["..."]}
Equality is the one in section 2.2 of spec/pricing-calculation-spec.md.
Needs: python 3.9+, `pip install jsonschema`. The second-engine check also needs node.
"""
import json, os, re, shutil, subprocess, sys, tempfile
from fractions import Fraction
from jsonschema import Draft7Validator

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
VEC = os.path.join(ROOT, 'examples', 'conformance', 'vectors')
SEC = os.path.join(ROOT, 'examples', 'conformance', 'second-engine')
load = lambda *p: json.load(open(os.path.join(ROOT, *p)))
errors = []
def bad(msg): errors.append(msg); print('FAIL', msg)

# ---------- equality, section 2.2 ----------
N = lambda x: None if x is None else Fraction(str(x))
def eq_num(a, b): return a == b if (a is None or b is None) else N(a) == N(b)
def compare(exp, got):
    d = []
    if exp['outcome'] != got.get('outcome'): return ['outcome %s != %s' % (got.get('outcome'), exp['outcome'])]
    if exp['outcome'] == 'validation_failure':
        if sorted(set(exp['codes'])) != sorted(set(got.get('codes', []))): d.append('codes %s != %s' % (sorted(set(got.get('codes', []))), exp['codes']))
        return d
    e, g = exp['statement'], got['statement']
    el = {l['line_id']: l for l in e['line_items']}; gl = {l['line_id']: l for l in g['line_items']}
    if sorted(el) != sorted(gl): d.append('line ids %s != %s' % (sorted(gl), sorted(el)))
    for i in el:
        if i not in gl: continue
        for k in ('category', 'product_id', 'target_id', 'source_fields'):
            if el[i][k] != gl[i][k]: d.append('line %s %s: %r != %r' % (i, k, gl[i][k], el[i][k]))
        if not eq_num(el[i]['line_total'], gl[i]['line_total']): d.append('line %s total %s != %s' % (i, gl[i]['line_total'], el[i]['line_total']))
    if len(e['adjustments']) != len(g['adjustments']): d.append('adjustment count %d != %d' % (len(g['adjustments']), len(e['adjustments'])))
    for n, (a, b) in enumerate(zip(e['adjustments'], g['adjustments'])):
        for k in ('adjustment_type', 'applies_to', 'source'):
            if a[k] != b[k]: d.append('adjustment %d %s: %r != %r' % (n, k, b[k], a[k]))
        if not eq_num(a['amount'], b['amount']): d.append('adjustment %d amount %s != %s' % (n, b['amount'], a['amount']))
    for blk in ('subtotals', 'totals'):
        for k in e[blk]:
            if not eq_num(e[blk][k], g[blk].get(k)): d.append('%s.%s %s != %s' % (blk, k, g[blk].get(k), e[blk][k]))
    ee = {x['credit_type_id']: x for x in e['entitlement_summary']}; ge = {x['credit_type_id']: x for x in g['entitlement_summary']}
    if sorted(ee) != sorted(ge): d.append('entitlement credit types %s != %s' % (sorted(ge), sorted(ee)))
    for c in ee:
        if c not in ge: continue
        for k in ('granted', 'committed_or_used', 'overage', 'overage_cost'):
            if not eq_num(ee[c][k], ge[c][k]): d.append('entitlement %s.%s %s != %s' % (c, k, ge[c][k], ee[c][k]))
        if ee[c]['overage_policy'] != ge[c]['overage_policy']: d.append('entitlement %s.overage_policy' % c)
    ew = sorted(set((w['type'], w['severity']) for w in e['warnings'])); gw = sorted(set((w['type'], w['severity']) for w in g['warnings']))
    if ew != gw: d.append('warnings %s != %s' % (gw, ew))
    if e['currency'] != g['currency']: d.append('currency %s != %s' % (g['currency'], e['currency']))
    return d

def compare_dir(out_dir):
    """Returns {vector-id: [differences]} for every vector that differs or is missing."""
    res = {}
    for vid in sorted(os.listdir(VEC)):
        exp = json.load(open(os.path.join(VEC, vid, 'expected.json')))['expected']
        p = os.path.join(out_dir, vid + '.json')
        if not os.path.exists(p): res[vid] = ['no output']; continue
        diffs = compare(exp, json.load(open(p)))
        if diffs: res[vid] = diffs
    return res

# ---------- checks ----------
def check_schemas():
    for n in ('pricing_model', 'deal_configuration', 'invoice_statement'):
        try: Draft7Validator.check_schema(load('schemas', n + '.json'))
        except Exception as ex: bad('schema %s is not a valid draft-07 schema: %s' % (n, str(ex)[:120]))
    print('schemas: 3 valid draft-07 schemas')

def spec_codes():
    s = open(os.path.join(ROOT, 'spec', 'pricing-calculation-spec.md')).read()
    a = s.split('## Annex A.')[1]; A = a.split('## Annex B.')[0]; B = a.split('## Annex B.')[1].split('## Annex C.')[0]
    return set(re.findall(r'^\| `([a-z_]+)` \|', A, re.M)), set(re.findall(r'^\| `([a-z_]+)` \|', B, re.M))

def check_vectors():
    V = {k: Draft7Validator(load('schemas', k + '.json')) for k in ('pricing_model', 'deal_configuration', 'invoice_statement')}
    codes, warn_types = spec_codes()
    ids = sorted(os.listdir(VEC)); n = 0
    for vid in ids:
        d = os.path.join(VEC, vid)
        try:
            model, cfg, exp = [json.load(open(os.path.join(d, f))) for f in ('model.json', 'config.json', 'expected.json')]
        except Exception as ex: bad('%s: cannot read files: %s' % (vid, ex)); continue
        for name, doc, key in (('model.json', model, 'pricing_model'), ('config.json', cfg, 'deal_configuration')):
            for e in list(V[key].iter_errors(doc))[:2]: bad('%s/%s: %s' % (vid, name, e.message[:100]))
        o = exp['expected']
        if o['outcome'] == 'statement':
            for e in list(V['invoice_statement'].iter_errors(o['statement']))[:2]: bad('%s/expected.json: %s' % (vid, e.message[:100]))
            for w in o['statement']['warnings']:
                if w['type'] not in warn_types: bad('%s: warning type %s is not in Annex B' % (vid, w['type']))
        else:
            for c in o['codes']:
                if c not in codes: bad('%s: failure code %s is not in Annex A' % (vid, c))
        n += 1
    index = {i['id']: i for i in load('examples', 'conformance', 'index.json')}
    if sorted(index) != ids: bad('index.json lists %d vectors, the directory has %d' % (len(index), len(ids)))
    print('vectors: %d checked against the schemas and Annexes A and B' % n)
    for f in ('acme_ai_platform_pms.json', 'acme_deal_config.json', 'acme_invoice.json'):
        key = {'acme_ai_platform_pms.json': 'pricing_model', 'acme_deal_config.json': 'deal_configuration', 'acme_invoice.json': 'invoice_statement'}[f]
        for e in list(V[key].iter_errors(load('examples', f)))[:2]: bad('examples/%s: %s' % (f, e.message[:100]))
    print('examples: 3 worked-example files checked')

def check_second_engine():
    if not shutil.which('node'): print('second engine: skipped (node not found)'); return
    tmp = tempfile.mkdtemp()
    try:
        shutil.copytree(os.path.join(SEC, 'engine'), os.path.join(tmp, 'second', 'engine'))
        os.makedirs(os.path.join(tmp, 'second', 'out')); os.symlink(VEC, os.path.join(tmp, 'vectors'))
        r = subprocess.run(['node', 'engine/run.js'], cwd=os.path.join(tmp, 'second'), capture_output=True, text=True)
        if r.returncode != 0 or 'CRASH' in r.stdout: bad('second engine crashed: ' + (r.stderr or r.stdout)[-300:]); return
        diffs = compare_dir(os.path.join(tmp, 'second', 'out'))
    finally: shutil.rmtree(tmp, ignore_errors=True)
    known = set(load('examples', 'conformance', 'second-engine', 'known-differences.json')['vectors'])
    new = sorted(set(diffs) - known); gone = sorted(known - set(diffs))
    for v in new: bad('second engine now differs on %s: %s' % (v, diffs[v][0][:100]))
    for v in gone: bad('second engine now matches %s: remove it from second-engine/known-differences.json' % v)
    print('second engine: %d vectors compared, %d known differences' % (len(os.listdir(VEC)), len(known)))

def main():
    if '--compare' in sys.argv:
        diffs = compare_dir(sys.argv[sys.argv.index('--compare') + 1])
        for v, d in diffs.items(): print('DIFF', v); [print('    ', x) for x in d]
        print('%d of %d vectors differ' % (len(diffs), len(os.listdir(VEC)))); return 1 if diffs else 0
    check_schemas(); check_vectors(); check_second_engine()
    print('OK' if not errors else '%d problem(s)' % len(errors)); return 1 if errors else 0
if __name__ == '__main__': sys.exit(main())
