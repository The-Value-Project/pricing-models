# Triage of spec gaps

Disposition of the 16 reference-engine findings (F-1 to F-16) and the 37 entries of `NOTES.md` (N-1 to N-37). "Written" means the specification now says it. "Decide" means the two readings differ, only one reading exists, or the point depends on a practitioner question, so it is left to the specification's owner.

## Written into the specification

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

## Already in the specification, no change

N-5, N-11, N-12, N-13, N-17, N-18, N-27, N-30, N-32, N-33, N-34, F-16.

## Decide

| Item | The question | Engines |
|---|---|---|
| N-1 | Unresolved ids: report only the reference failures and stop, or keep going (section 6 says report every failure)? | Second engine stops |
| N-2 | Region codes: list the ISO 3166-1 codes in the spec, or accept any two capital letters? | Second engine accepts any two |
| F-2, N-21 | `applies_to` of a discount over several lines or products: join the ids, or `contract_total`? | Differ; no vector covers a module-scope discount over several lines |
| F-3, N-31 | A price-book entry with a null `currency`: the book's currency or the model's? | Not separated by any vector |
| F-6, N-28 | `annualized_total` when an adjustment spans recurring and one-time lines: round the parts separately or the exact amount? | Differ |
| F-7, N-20 | Do `module` and `product` discount scopes include one-time modules? | Agree, but close to Q5 |
| F-10 | `custom_unit_price` on a `flat` module price: `invalid_override`? | Reference only; second engine builds a `per_unit` price |
| F-11, N-7 | `waived` on `credit_type_overage` with no `overage_price`; the full meaning of "invalid override" | Differ |
| F-14, N-6 | `consumption_conditions_ignored`: credit types in the deal, or every credit type in the model? | Differ; invisible to the comparison |
| N-25 | `step_tiers` value in a gap between brackets: 0? | Second engine only |
| N-26 | `applies_to` of a minimum with several target products | Second engine only |
| N-35 | A required module also listed in `module_selections`: charged once, no error? | Second engine; near Q10 |
| N-9, N-23, F-12, N-14, F-15, N-15 | Replacement and negotiated-override details, and pools (Q3, Q8, DN-10, DN-13, DN-17) | Wait for the sheet |
| N-36, N-37 | Done in section 9.2, except the overage entry when several contribute | See DN-20 |
