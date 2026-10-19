# Migration guide: 1.x to 2.0.0

> License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · Part of [The Value Project](https://github.com/The-Value-Project/pricing-models)

**Status:** In progress. This guide is built up as the 2.0.0 changes land. Each renamed or removed path is listed here. It is complete when 2.0.0 is released.

`GOVERNANCE.md` requires a migration guide for a MAJOR version. Documents that conform to 1.x do not conform to 2.0.0 until the changes below are made.

## Renamed paths

| 1.x | 2.0.0 | Schema |
|---|---|---|
| `PricingModel.products[].plans[]` | `PricingModel.products[].commitment_plans[]` | `pricing_model.json` |
| `InvoiceStatement.adjustments[].adjustment_type` = `plan_adjustment` | `commitment_plan_adjustment` | `invoice_statement.json` |

`DealConfiguration.billing.plan_id` keeps its name. Its value must now be the `id` of a `products[].commitment_plans[]` entry. Rename the property in `PricingModel` documents. The ids inside it do not change.

## Not breaking

- The three shapes `price`, `credit_grant` and `eligibility` are now defined once under `$defs`. The set of valid documents is the same.
