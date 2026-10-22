# Second engine (blind reading)

A Node.js engine written from `spec/pricing-calculation-spec.md` and the schemas alone, without access to `expected.json`, to test whether the specification can be implemented from a second, independent reading.

- `engine/` is the engine. `node engine/run.js [vector-id ...]` reads `../vectors/<id>/model.json` and `config.json` and writes `out/<id>.json`.
- `tools/check-out.js` checks every statement in `out/` against `schemas/invoice_statement.json`.
- `NOTES.md` lists every place the specification was silent, ambiguous or contradictory, and the reading the engine chose (37 entries).
- `out/` holds the results of the blind run.

## Result against `expected.json`

Compared under the rules of specification section 2.2: 89 of 94 vectors match. All amounts, subtotals, totals, adjustments, entitlement summaries and warnings match, and all 26 validation failures report the expected code sets. The 5 differences are all on credit-package or overage lines (`NOTES.md` entries 36 and 37): the `product_id` of a package line, and which `config#` pointer `source_fields` lists. Both are gaps in section 9.2. The engine was not changed to match the expected values.
