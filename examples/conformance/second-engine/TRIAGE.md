# Triage of spec gaps

Disposition of the 16 reference-engine findings (F-1 to F-16) and the 37 entries of `NOTES.md` (N-1 to N-37).

## Written into the specification

Settled the same way by both engines, with no open practitioner question behind them:

| Where | What | From |
|---|---|---|
| 2.2 | `invoice_id` and `period` are not compared (as the conformance README already says) | N-29, F-9 |
| 7.1 step 3 | A plan from `billing.plan_id` counts as selected; an ineligible plan's grants do not join pools | N-10, F-13 |
| 7.1 step 4 | A dependency applies only when the dependent object is present; the required object may be in any selection | N-3 |
| 7.1 step 6 | Direction of `prerequisite` and `mutual_exclusion`; `relationship_not_modeled` is emitted whenever the relationship exists | N-4 |
| 7.1 step 7 | A mandatory manual discount is invalid and not applied | N-19 |
| 7.7 | Turn of an exclusive group, ties, and when a group counts as applied | N-24 |
| 8 | `overage_cost` is 0 when determinate and nothing is charged | N-16 |
| 9.2 | `target_id` per line category; `source_fields` pointer for a `fallback_multiplier` price | F-8, F-4 |
| 9.3 | Adjustments are listed line by line; zero-amount adjustments are not reported | F-5, N-8, F-1, N-22 |

Decided by the specification's owner (2026-10-22):

| Where | Decision | From |
|---|---|---|
| 6 | An unresolved id ends the calculation after step 1 of 7.1 | N-1 |
| 4.7 | Country codes are those assigned in ISO 3166-1 on 1 January 2026; later codes only in a MINOR release | N-2 |
| 4.4 | A required module that is also in `module_selections` is charged once, with no failure | N-35 |
| 7.3 | A price-book entry with a null `currency` is in the book's currency | F-3, N-31 |
| 7.4 | `invalid_override`: also a missing target, any `credit_type_overage` override on a credit type with no `overage_price`, and `custom_unit_price` on a module price with no `credit_type_id` | F-10, F-11, N-7 |
| 7.6 | `consumption_conditions_ignored` is given for credit types with a pool or a billed quantity | F-14, N-6 |
| 7.7 | A `step_tiers` input in a gap between brackets gives 0 | N-25 |
| 7.7 | `module` and `product` discount scopes include one-time charges | F-7, N-20 |
| 9.3 | `applies_to` is the one line, product or credit type matched, else `contract_total`; the same rule for minimum true-ups | F-2, N-21, N-26 |
| 9.4 | `annualized_total` sums rounded recurring lines and the rounded recurring share of spread adjustments | F-6, N-28 |

## Already in the specification, no change

N-5, N-11, N-12, N-13, N-17, N-18, N-27, N-30, N-32, N-33, N-34, F-16.

## Waiting on the practitioner sheet

N-9, N-23, F-12 and N-14 (Q3, Q8, DN-10, DN-12 to DN-14), F-15 and N-15 (DN-17). Also the `quantities` entry an overage line lists when several contribute (N-37, DN-20); no vector covers it.

## Where the second engine now differs from the specification

The engine in this folder is the blind run and has not been changed. It differs from the specification on points no vector covers:

- N-2: it accepts any two capital letters as a country.
- F-10: it builds a `per_unit` price for `custom_unit_price` on a flat module price.
- F-11, N-7: it accepts `waived` on an overage with no `overage_price`.
- F-14, N-6: it warns for every credit type that has a consumption rule.
- N-26: a minimum over several products is named after the first one.

## The second engine on 125 vectors (2026-10-29)

31 vectors were added for the rules settled in the triage above and in the follow-up on override targets. The second engine was run on all 125, unchanged. It differs from `expected.json` on 13, and every difference is explained:

| Vectors | Why they differ |
|---|---|
| `overage-pay-as-you-go`, `overage-mixed-period-pools`, `overage-package-units-count`, `overage-price-override-is-an-adjustment`, `package-flat-price-ignores-count`, `package-per-unit-price` | Section 9.2 gaps (`product_id` and `source_fields` for credit-package and overage lines), settled after the blind run. The engine was not updated. |
| `region-unassigned-code`, `region-code-not-iso-assigned` | N-2: it accepts any two capital letters as a country. |
| `custom-unit-price-on-flat-module` | F-10: it builds a `per_unit` price for `custom_unit_price` on a flat module price. |
| `overage-override-without-overage-price` | F-11, N-7: it accepts `waived` on an overage with no `overage_price`. |
| `consumption-conditions-credit-type-not-in-deal` | F-14, N-6: it warns for every credit type that has a consumption rule. |
| `override-target-not-in-model`, `grant-override-credit-type-not-in-model` | The engine reports `invalid_override`. The specification now says an id that is not in the model is `unresolved_reference` (found in step 1 of 7.1), and `invalid_override` is for a target that is in the model but not charged. |

Where the two engines agree on the new vectors: the override replacement of an overage price, reported as an adjustment of -$60 on `credit_type:api` (`overage-price-override-is-an-adjustment`), and every exclusive-group, scope, dependency, relationship and annualized-total vector.
