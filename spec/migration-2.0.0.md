# Migration guide: 1.x to 2.0.0

> License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · Part of [The Value Project](https://github.com/The-Value-Project/pricing-models)

**Status:** In progress. It lists every path that changes in the 2.0.0 schemas. It is complete when 2.0.0 is released.

`GOVERNANCE.md` requires a migration guide for a MAJOR version. A document that conforms to 1.x does not conform to 2.0.0 until the changes below are made. Schemas read `schema_version: "2.0.0"` after the change.

## PricingModel

| Change | What to do |
|---|---|
| Renamed: `products[].plans[]` → `products[].commitment_plans[]` | Rename the array. The ids inside it do not change. |
| New required root fields: `schema_version`, `model_id`, `vendor_name`, `effective_date`, `currency`, `comparison_grid`, `conformance_profile` | Add them. `vendor_name`, `effective_date` and `conformance_profile` may be null. `comparison_grid` may be `[]`. `currency` is an ISO 4217 code. |
| New required `position` on products, modules, tiers and commitment plans | Add it. Null means array order. |
| New required `commitment_plans[].default_for_tier_ids` | Add `[]` if no tier has a default. |
| `commitment_plans[].commitment_months` may be null | None. Null means no minimum term, or a commitment that is not a clean number of months. |
| New required `price.credit_type_id` | Set it to the credit type that drives the price, for `per_unit`, `tiered` and `volume` module prices. Use null for `flat` prices and for credit-package prices. |
| `price` type pairing is enforced | `tiered` uses `tiers` only. `volume` uses `breakpoints` only. `flat` and `per_unit` use neither. |
| New required `credit_types[].overage_price` | A price when `overage_policy` is `pay_as_you_go`, otherwise null. |
| New required `credit_packages[].rollover_percent` | A number from 0 to 100 when `rollover_policy` is `partial`, otherwise null. |
| New required `pricing_rules.rounding.method` | `half_away_from_zero`. A null `rounding` still means no rounding. |
| New required `dependent_kind` and `requires_kind` on `module_dependencies[]`, and `subject_kind` and `related_to_kind` on `pricing_relationships[]` | Set the kind of the object each id names: `module`, `tier`, `product` or `credit_package`. `related_to_kind` is null when `related_to` is null. |
| Ids must match `^[a-z0-9]+(-[a-z0-9]+)*$` | Rename any id with capitals, underscores or spaces, and every reference to it. An id must stay the same across versions of a model and must not be reused for a different object. |
| Currency codes must match `^[A-Z]{3}$` | Applies to `price.currency`, `price_books[].currency` and `minimum_commitments[].currency`. |
| Every `discount_application_order` must list every discount that can apply | Add the missing ids. |

New values that are not breaking: `unknown` for a grant's `renewal_behavior`, `period` and `metric_type`, and for a credit package's `rollover_policy`.

## DealConfiguration

| Change | What to do |
|---|---|
| New required `schema_version` | `"2.0.0"`. |
| New required `product_selections[].commitment_plan_id` | The selected commitment plan of that product, or null. |
| New required `product_selections[].module_selections[]` | Add `[]` if the deal has no add-ons. A selected module must not already be in the chosen tier. |
| New required `growth_schedule[].period_index` | Integer from 1, unique within the schedule. `period_label` is display text only. |
| `negotiated_overrides.price_overrides[]`: new required `target_kind`; `target_id` may be null | Use `target_kind: "total_deal"` with a null `target_id` where you wrote `target_id: "total_deal"`. Use `module` or `credit_package` otherwise. |
| New required `negotiated_overrides.credit_grant_overrides[].period` | The grant period the override replaces. |
| `billing.plan_id` is deprecated and may be null | Prefer `product_selections[].commitment_plan_id`. `billing.plan_id` still works as the default for a selection whose `commitment_plan_id` is null. |
| Ids must match the id pattern | As for `PricingModel`. |

## InvoiceStatement

| Change | What to do |
|---|---|
| Renamed: `adjustments[].adjustment_type` value `plan_adjustment` → `commitment_plan_adjustment` | Emit the new value. |
| New required `schema_version` and `model_id` | `"2.0.0"`, and the `PricingModel.model_id` the statement was calculated from. |
| `line_items[].product_id` may be null | Null for a line that belongs to no single product. |
| `line_items[].source_fields[]` use a defined syntax | `"model#"` or `"config#"` followed by an RFC 6901 JSON Pointer. |
| `totals.annualized_total` and `totals.total_contract_value` are never null | Always emit a number when the calculation succeeds. |
| `entitlement_summary[].overage` and `overage_cost` may be null | Null means indeterminate, for a credit type with an `unknown` grant field. |

## Pricing pages (`spec/pricing-page-spec.md` 3.0.0)

| Change | What to do |
|---|---|
| Front matter: `schema_version: "2.0.0"` and a new `model_id` | Set both. Front-matter `model_id`, `effective_date` and `currency` must equal the JSON's. |
| §4b Price and Billing are redefined | Rewrite each tier's Price cell by the new rule. Billing lists the distinct periods. |
| New conditional sections §4k, §4l and §4m | Add them if `credit_types[]`, `credit_packages[]`, `bundles[]` or `comparison_grid[]` is non-empty. |
| The JSON block keeps every root field | Do not strip fields at the root. List any dropped nested field after the block. |
| The LLM block and footer name "PMS v2.0.0" | Replace "1.4", which was never a published version. |

## Deprecated, not removed

| Field | Replacement |
|---|---|
| `discount_strategies[].input_keys` | `shape.*.metric` |
| `pricing_rules.calculation_order` | None. The phase order is fixed by the specification. |
| `DealConfiguration.billing.plan_id` | `product_selections[].commitment_plan_id` |

Each stays accepted in 2.0.x and can be removed no earlier than two MINOR releases after 2.0.0.

## Not breaking

- `price`, `credit_grant` and `eligibility` are now defined once under `$defs`. The set of valid documents is the same.
