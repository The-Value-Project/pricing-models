# pricing-models

**JSON schemas and a deterministic specification for sales-led B2B pricing, deal configuration, and invoice generation.**

Part of [The Value Project](https://github.com/The-Value-Project) — open schemas for the full B2B commercial lifecycle.

[![Schemas: Apache-2.0](https://img.shields.io/badge/schemas-Apache--2.0-blue)](LICENSE-CODE)
[![Docs: CC BY 4.0](https://img.shields.io/badge/docs-CC--BY--4.0-green)](LICENSE-DOCS)
[![PricingModel](https://img.shields.io/badge/PricingModel-v1.0.0-brightgreen)](schemas/pricing_model.json)
[![DealConfiguration](https://img.shields.io/badge/DealConfiguration-v1.0.0-brightgreen)](schemas/deal_configuration.json)
[![InvoiceStatement](https://img.shields.io/badge/InvoiceStatement-v1.0.0-brightgreen)](schemas/invoice_statement.json)
[![Spec](https://img.shields.io/badge/Spec-v2.0.0--draft-orange)](spec/pricing-calculation-spec.md)

---

## Overview

This repository contains three interoperable JSON schemas and a full computation specification:

| Schema | File | Version | License | Role |
|---|---|---|---|---|
| `PricingModel` (PMS) | `schemas/pricing_model.json` | 1.0.0 | Apache-2.0 | What the vendor offers |
| `DealConfiguration` | `schemas/deal_configuration.json` | 1.0.0 | Apache-2.0 | What the customer buys |
| `InvoiceStatement` | `schemas/invoice_statement.json` | 1.0.0 | Apache-2.0 | What the customer owes |

The [Pricing Calculation Specification](spec/pricing-calculation-spec.md) defines the 9-phase deterministic computation algorithm that transforms a PricingModel + DealConfiguration pair into an InvoiceStatement.

Specifications and documentation in `spec/` are licensed under **CC BY 4.0**.

> **Related repo:** [`value-models`](https://github.com/The-Value-Project/value-models) — ValueModel and CustomerVariables schemas that feed into DealConfiguration.

---

## Licensing

| Content | License | SPDX | Full text |
|---|---|---|---|
| JSON schemas and examples (`schemas/`, `examples/`) | Apache License 2.0 | `Apache-2.0` | [LICENSE-CODE](LICENSE-CODE) |
| Specifications and docs (`spec/`, `README.md`) | Creative Commons Attribution 4.0 | `CC-BY-4.0` | [LICENSE-DOCS](LICENSE-DOCS) |

See [LICENSE](LICENSE) for the dual-license overview and attribution guidance.

---

## The Three Schemas

### `PricingModel` — `schemas/pricing_model.json`

A structured, computable representation of a vendor's complete pricing. Produced from any source (pricing pages, sales decks, contracts) by an LLM or human modeler. Consumed by a pricing engine, configuration UI, or deal recommender.

**Top-level structure:**

```
PricingModel
├── schema_version            "2.0.0"
├── model_id                  Stable unique identifier (referenced by DealConfiguration.model_reference.model_id)
├── vendor_name / effective_date / currency   (currency: ISO 4217 base currency)
│
├── products[]                Core product catalog (items carry a display `position`)
│   ├── modules[]             Individually priced capabilities (each has exactly one price object)
│   ├── tiers[]               Tiers — sets of included module_ids + credit grants
│   └── commitment_plans[]    Commitment-period options — percentage adjustments to module prices
│
├── bundles[]                 Multi-product bundles with adjustment percentages
├── discounts[]               Available discounts (manual + strategy-driven)
├── credit_types[]            Entitlement pool definitions — every unit of value is a credit_type
├── credit_packages[]         Purchasable credit blocks
├── discount_strategies[]     Parameterized discount functions (step_tiers, linear_ramp, etc.)
├── price_books[]             Regional price override tables
├── variants[]                Deal-motion-specific overrides (new_logo, renewal, expansion, reprice)
├── minimum_commitments[]     Minimum spend floors with true-up behavior
├── pricing_rules             Computation config: discount order, rounding, exclusive-group and missing-input handling
├── business_rules[]          Plain-text constraints (hard_block | warning | info)
├── module_dependencies[]     Module dependency graph
├── pricing_relationships[]   Cross-product rules
├── comparison_grid[]         Features and limits compared across tiers (descriptive only; never read by the calculation)
└── conformance_profile       Which regions an implementation keeps, derives and drops (or null)
```

**Price primitives:** All pricing uses exactly one of four types:

| Primitive | Semantics |
|---|---|
| `flat` | Fixed amount regardless of quantity |
| `per_unit` | `unit_price × quantity` |
| `tiered` | Graduated bands — each unit priced at its band's rate |
| `volume` | All units priced at the rate of the band containing total quantity |

**No free-form expressions exist anywhere in the model.**

**Credit types:** Any unit of value (seats, API calls, tokens, GB) is modeled as a `credit_type` with `consumption_rules` and `overage_policy`. Entitlements are granted via `included_credit_grants` — never as hardcoded fields.

**Business rules:** Every constraint is expressed as a self-contained plain-text `description` that a human or LLM can apply without external documentation, plus a `rule_type` and `enforcement` level.

---

### `DealConfiguration` — `schemas/deal_configuration.json`

A customer-specific deal referencing a PricingModel instance. Created by a salesperson or generated by an LLM.

**Top-level structure:**

```
DealConfiguration
├── schema_version            "2.0.0"
├── config_id                 Unique deal identifier (referenced by InvoiceStatement.config_id)
├── model_reference.model_id  References PricingModel.model_id
├── customer                  name, domain, region
├── deal_motion               new_logo | renewal | expansion | reprice
├── billing                   plan_id (deprecated), contract_start_date, contract_term_months
│
├── product_selections[]
│   ├── product_id / tier_id / commitment_plan_id
│   ├── module_selections[]   add-on modules (modules in no tier)
│   ├── quantities[]          credit_type_id, quantity, quantity_type, growth_schedule (by contract year)
│   └── credit_package_selections[]
│
├── bundle_selections[]
├── discount_selections[]     discount_id + manual_value
└── negotiated_overrides
    ├── price_overrides[]     target_kind + target_id; fixed_price | custom_unit_price | discount_percentage | discount_amount | waived | capped
    ├── credit_grant_overrides[]   credit_type_id + period + new_quantity
    └── custom_terms[]        sla_upgrade | price_lock | mfn_clause | other
```

**Join keys:** All `product_id`, `tier_id`, `commitment_plan_id`, `credit_type_id`, `credit_package_id`, `module_id`, `discount_id`, `bundle_id` and override `target_id` values reference IDs declared in the PricingModel. Ids match `^[a-z0-9]+(-[a-z0-9]+)*$`. Unresolved join keys are fatal errors.

**Quantity types:** `committed` (contractual minimum, billed), `estimated` (a forecast: billed, with a warning), `maximum` (a ceiling: never billed, and a billed quantity above it is an error), `starting` (billed; the quantity until the `growth_schedule` says otherwise).

---

### `InvoiceStatement` — `schemas/invoice_statement.json`

The deterministic, auditable output of the pricing engine.

**Top-level structure:**

```
InvoiceStatement
├── schema_version            "2.0.0"
├── invoice_id / config_id / model_id / period / currency
│
├── line_items[]
│   ├── category              module_charge | credit_package | usage_overage | ...
│   ├── quantity / unit / unit_price / line_total
│   ├── graduated_detail[]    Band-level breakdown for tiered/volume pricing
│   ├── computation_method    Human-readable trace
│   └── source_fields[]       "model#" or "config#" plus a JSON Pointer to the field that drove this line
│
├── subtotals                 recurring / one_time / gross
├── adjustments[]
│   ├── adjustment_type       commitment_plan_adjustment | bundle_discount | strategy_discount | negotiated_* | minimum_true_up | other
│   ├── amount                Signed (negative = discount, positive = true-up)
│   └── source                Identifies the PricingModel object that drove this adjustment
│
├── totals                    total_adjustments / net_total / annualized_total / total_contract_value
├── entitlement_summary[]     Per credit_type: granted / committed_or_used / overage / overage_cost (null when indeterminate)
└── warnings[]                error | warning | info
```

Every line item traces to `source_fields[]`. Every adjustment identifies its source. Identical inputs produce identical outputs.

---

## The Computation Engine

The [Pricing Calculation Specification](spec/pricing-calculation-spec.md) defines a **9-phase deterministic evaluation algorithm:**

| Phase | Name | What happens |
|---|---|---|
| 0 | Validate | Join keys, hard-block rules, module dependencies |
| 1 | Variant | Apply deal-motion overrides |
| 2 | Price Book | Apply regional price overrides |
| 3 | Price resolution | Commitment-plan adjustment, bundle adjustment, negotiated price replacements |
| 4 | Line Items | Compute module + credit package charges |
| 5 | Overages | Compare committed quantities to entitlements |
| 6 | Discounts | Apply in `discount_application_order` |
| 7 | Minimums | True up to minimum commitment floors |
| 8 | Assemble | Sum subtotals, net total, annualize, compute TCV |

The specification does not define a reverse-solve algorithm. Finding a configuration that reaches a target price is an optimization with more than one answer, so it sits outside the deterministic calculation. An informative annex lists the levers an application can vary.

---

## Terminology

| Term | Meaning |
|---|---|
| **Tier** | A named set of modules with credit grants. What most buyers call a "plan". |
| **Commitment plan** | A commitment-period option (annual or monthly) with a percentage adjustment. `products[].commitment_plans[]`, renamed from `plans[]` in 2.0.0. |
| **Credit type** | An entitlement pool of any unit (seats, API calls, GB). It is a quantity, not money. |
| **Credit package** | A purchasable block of units of one credit type. |
| **Grant** | Units of a credit type included by a module, tier, commitment plan or bundle (`included_credit_grants[]`). |
| **Price adjustment** and **discount** | See the table below. |

Readers coming from other pricing schemas should note that in some of them a "plan" is what this standard calls a tier.

## Price-reduction mechanisms

Four mechanisms change a price. They differ in where they are defined, in sign and units, and in where they apply in the calculation. The phase numbers are the 0-based numbers in the table above.

| Mechanism | Defined at | Sign and units today | Applied in phase |
|---|---|---|---|
| Commitment-plan adjustment | `products[].commitment_plans[].adjustment.percent` | Signed percentage points; negative is a discount | 3 |
| Bundle adjustment | `bundles[].adjustment.percent` | Sign not documented | Not placed in any phase |
| Model discounts (manual or strategy-driven) | `discounts[]` and `discount_strategies[]` | Positive magnitudes | 6 |
| Negotiated overrides | `DealConfiguration.negotiated_overrides` | Per `override_type` | Not placed in any phase |

Where the table says a sign or a phase is not documented, the published documents do not say. The normative specification will.

---

## Cross-Reference to value-models

The `products[].tiers[]` catalog in the PricingModel corresponds to `tiers_and_modules[]` in the [value-models](https://github.com/The-Value-Project/value-models) repo's `ValueModel` schema. The join is on display text: a tier's `label` here matches `name` there, so renaming a tier on either side breaks the join. This is the cross-repo join:

- The ValueModel answers: *what value does each tier unlock, and what ROI does it deliver for this customer?*
- The PricingModel answers: *what does each tier cost, and how is that price computed?*
- A `CustomerVariables` analysis recommends a tier → that tier feeds `DealConfiguration.product_selections[].tier_id`

---

## Specifications

### `spec/pricing-calculation-spec.md` — [CC BY 4.0](LICENSE-DOCS)

Normative calculation specification. Defines the scope, the 9-phase algorithm, price primitive semantics, discount strategy shapes, entitlement and overage calculation, rounding, output rules, and what makes two engines conformant. Draft until the 2.0.0 release.

### `spec/pricing-page-spec.md` — [CC BY 4.0](LICENSE-DOCS)

Specifies the format of a conforming **pricing model page**: a machine-readable Markdown document wrapping a PricingModel JSON instance with front matter metadata and human-readable tables.

### `spec/pricing-model-llm-reference.md` — [CC BY 4.0](LICENSE-DOCS)

LLM interpreter instructions for the PricingModel JSON. Instructs frontier models how to apply price primitives, compute entitlements, apply discounts in order, and enforce business rules.

---

## Conformance Checklist

- [ ] PricingModel instances validate against `schemas/pricing_model.json` (v1.0.0)
- [ ] DealConfiguration instances validate against `schemas/deal_configuration.json` (v1.0.0)
- [ ] InvoiceStatement instances validate against `schemas/invoice_statement.json` (v1.0.0)
- [ ] All price computations use only the 4 declared price primitives
- [ ] No free-form price expressions exist in the engine
- [ ] Join keys validated in Phase 0 before any computation
- [ ] `hard_block` business rules halt computation
- [ ] Discounts apply in declared `discount_application_order`
- [ ] Every invoice line has `source_fields[]` tracing to model and config
- [ ] Engine is deterministic: identical inputs → identical outputs
- [ ] All entitlements use `credit_types[]` + `included_credit_grants` — no hardcoded fields

---

## File Structure

```
pricing-models/
├── LICENSE                                Dual-license overview + attribution
├── LICENSE-CODE                           Apache 2.0 (full text) — applies to schemas/
├── LICENSE-DOCS                           CC BY 4.0 (full text) — applies to spec/, docs
├── README.md                              This file (CC BY 4.0)
├── CONTRIBUTING.md                        Contribution guide (CC BY 4.0)
├── CHANGELOG.md                           Version history (CC BY 4.0)
├── .github/workflows/check.yml            CI: schemas, vectors, worked example, second engine
├── schemas/
│   ├── pricing_model.json                 PricingModel schema v1.0.0 (Apache-2.0)
│   ├── deal_configuration.json            DealConfiguration schema v1.0.0 (Apache-2.0)
│   └── invoice_statement.json             InvoiceStatement schema v1.0.0 (Apache-2.0)
├── spec/
│   ├── pricing-calculation-spec.md        Calculation specification v2.0.0 draft (CC BY 4.0)
│   ├── migration-2.0.0.md                 Migration guide, 1.x to 2.0.0 (CC BY 4.0)
│   ├── pricing-page-spec.md               Pricing page specification v3.0.0 (CC BY 4.0)
│   └── pricing-model-llm-reference.md     LLM interpreter reference v2.0.0 (CC BY 4.0)
└── examples/
    ├── larkspur_platform_pms.json         Worked example PricingModel instance
    ├── larkspur_deal_config.json          Worked example DealConfiguration
    ├── larkspur_invoice.json              Worked example InvoiceStatement
    └── conformance/                       Conformance vectors, a second engine and a check script (see its README)
```

---

## Versioning

| Schema / Document | Version | Targets schema version | Status |
|---|---|---|---|
| `PricingModel` | 1.0.0 | — | Implementation-Ready |
| `DealConfiguration` | 1.0.0 | — | Implementation-Ready |
| `InvoiceStatement` | 1.0.0 | — | Implementation-Ready |
| Calculation specification (`spec/pricing-calculation-spec.md`) | 2.0.0 draft | 2.0.0 | Draft until the 2.0.0 release |
| Pricing page specification (`spec/pricing-page-spec.md`) | 3.0.0 | 2.0.0 | Implementation-Ready |
| LLM interpreter reference (`spec/pricing-model-llm-reference.md`) | 2.0.0 | 2.0.0 | Implementation-Ready |

Versions follow `MAJOR.MINOR.PATCH` (semver). Each schema has one version, which is its `x-version`. The `schema_version` field in each JSON instance names the release the document was written for. It can be any version in the schema's MAJOR line, so a 2.0.0 document stays valid when the schema moves to 2.1.0. Each specification document has its own version, and the table shows which schema version it targets. "PMS vX.Y.Z" in a document means a schema version.

---

## Contributing

We welcome feedback on schemas, specifications, and implementation experience. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening issues or pull requests.

---

## Related

- [`value-models`](https://github.com/The-Value-Project/value-models) — ValueModel and CustomerVariables schemas
- [The Value Project](https://github.com/The-Value-Project) — org overview and cross-schema relationships
- [ValueIQ](https://valueiq.ai) — the team behind this work

---

*Part of [The Value Project](https://github.com/The-Value-Project) by [ValueIQ](https://valueiq.ai)*
*Schemas: [Apache-2.0](LICENSE-CODE) · Docs: [CC BY 4.0](LICENSE-DOCS)*
