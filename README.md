# pricing-models

**JSON schemas and a deterministic specification for sales-led B2B pricing, deal configuration, and invoice generation.**

Part of [The Value Project](https://github.com/The-Value-Project) — open schemas for the full B2B commercial lifecycle.

[![Schemas: Apache-2.0](https://img.shields.io/badge/schemas-Apache--2.0-blue)](LICENSE-CODE)
[![Docs: CC BY 4.0](https://img.shields.io/badge/docs-CC--BY--4.0-green)](LICENSE-DOCS)
[![PricingModel](https://img.shields.io/badge/PricingModel-v1.0.0-brightgreen)](schemas/pricing_model.json)
[![DealConfiguration](https://img.shields.io/badge/DealConfiguration-v1.0.0-brightgreen)](schemas/deal_configuration.json)
[![InvoiceStatement](https://img.shields.io/badge/InvoiceStatement-v1.0.0-brightgreen)](schemas/invoice_statement.json)
[![Spec](https://img.shields.io/badge/Spec-v1.0.0-blue)](spec/pricing-meta-model-spec.md)

---

## Overview

This repository contains three interoperable JSON schemas and a full computation specification:

| Schema | File | Version | License | Role |
|---|---|---|---|---|
| `PricingModel` (PMS) | `schemas/pricing_model.json` | 1.0.0 | Apache-2.0 | What the vendor offers |
| `DealConfiguration` | `schemas/deal_configuration.json` | 1.0.0 | Apache-2.0 | What the customer buys |
| `InvoiceStatement` | `schemas/invoice_statement.json` | 1.0.0 | Apache-2.0 | What the customer owes |

The [Sales-Led Pricing Meta-Model Specification](spec/pricing-meta-model-spec.md) defines the 9-phase deterministic computation algorithm that transforms a PricingModel + DealConfiguration pair into an InvoiceStatement.

Specifications and documentation in `spec/` are licensed under **CC BY 4.0**.

> **Related repo:** [`value-models`](https://github.com/The-Value-Project/value-models) — ValueModel and CustomerVariables schemas that feed into DealConfiguration.

---

## Licensing

| Content | License | SPDX | Full text |
|---|---|---|---|
| JSON schemas (`schemas/`) | Apache License 2.0 | `Apache-2.0` | [LICENSE-CODE](LICENSE-CODE) |
| Specifications and docs (`spec/`, `README.md`, `examples/`) | Creative Commons Attribution 4.0 | `CC-BY-4.0` | [LICENSE-DOCS](LICENSE-DOCS) |

See [LICENSE](LICENSE) for the dual-license overview and attribution guidance.

---

## The Three Schemas

### `PricingModel` — `schemas/pricing_model.json`

A structured, computable representation of a vendor's complete pricing. Produced from any source (pricing pages, sales decks, contracts) by an LLM or human modeler. Consumed by a pricing engine, configuration UI, or deal recommender.

**Top-level structure:**

```
PricingModel
├── schema_version            "1.0.0"
├── model_id                  Stable unique identifier (referenced by DealConfiguration.model_reference.model_id)
├── vendor_name / effective_date / currency
│
├── products[]                Core product catalog
│   ├── modules[]             Individually priced capabilities (each has exactly one price object)
│   ├── tiers[]               Plan levels — sets of included module_ids + credit grants
│   └── plans[]               Commitment-period options — percentage adjustments to module prices
│
├── bundles[]                 Multi-product bundles with adjustment percentages
├── discounts[]               Available discounts (manual + strategy-driven)
├── credit_types[]            Entitlement pool definitions — every unit of value is a credit_type
├── credit_packages[]         Purchasable credit blocks
├── discount_strategies[]     Parameterized discount functions (step_tiers, linear_ramp, etc.)
├── price_books[]             Regional price override tables
├── variants[]                Deal-motion-specific overrides (new_logo, renewal, expansion, reprice)
├── minimum_commitments[]     Minimum spend floors with true-up behavior
├── pricing_rules             Computation config: discount order, rounding, currency policy
├── business_rules[]          Plain-text constraints (hard_block | warning | info)
├── module_dependencies[]     Module dependency graph
└── pricing_relationships[]   Cross-product rules
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
├── schema_version            "1.0.0"
├── config_id                 Unique deal identifier (referenced by InvoiceStatement.config_id)
├── model_reference.model_id  References PricingModel.model_id
├── customer                  name, domain, region
├── deal_motion               new_logo | renewal | expansion | reprice
├── billing                   plan_id, contract_start_date, contract_term_months
│
├── product_selections[]
│   ├── product_id / tier_id
│   ├── quantities[]          credit_type_id, quantity, quantity_type, growth_schedule
│   └── credit_package_selections[]
│
├── bundle_selections[]
├── discount_selections[]     discount_id + manual_value
└── negotiated_overrides
    ├── price_overrides[]     fixed_price | discount_percentage | waived | capped
    ├── credit_grant_overrides[]
    └── custom_terms[]        sla_upgrade | price_lock | mfn_clause | other
```

**Join keys:** All `product_id`, `tier_id`, `plan_id`, `credit_type_id`, `credit_package_id`, `discount_id`, and `bundle_id` values reference IDs declared in the PricingModel. Unresolved join keys are fatal errors.

**Quantity types:** `committed` (contractual minimum, always billed), `estimated` (forecast only), `maximum` (capacity ceiling), `starting` (initial value with `growth_schedule`).

---

### `InvoiceStatement` — `schemas/invoice_statement.json`

The deterministic, auditable output of the pricing engine.

**Top-level structure:**

```
InvoiceStatement
├── schema_version            "1.0.0"
├── invoice_id / config_id / model_id / period / currency
│
├── line_items[]
│   ├── category              module_charge | credit_package | usage_overage | ...
│   ├── quantity / unit / unit_price / line_total
│   ├── graduated_detail[]    Band-level breakdown for tiered/volume pricing
│   ├── computation_method    Human-readable trace
│   └── source_fields[]       JSON paths to PricingModel/DealConfiguration fields that drove this line
│
├── subtotals                 recurring / one_time / gross
├── adjustments[]
│   ├── adjustment_type       plan_adjustment | volume_discount | manual_discount | ...
│   ├── amount                Signed (negative = discount, positive = true-up)
│   └── source                Identifies the PricingModel object that drove this adjustment
│
├── totals                    total_adjustments / net_total / annualized_total / total_contract_value
├── entitlement_summary[]     Per credit_type: granted / committed_or_used / overage / overage_cost
└── warnings[]                error | warning | info
```

Every line item traces to `source_fields[]`. Every adjustment identifies its source. Identical inputs produce identical outputs.

---

## The Computation Engine

The [Sales-Led Pricing Meta-Model Specification](spec/pricing-meta-model-spec.md) defines a **9-phase deterministic evaluation algorithm:**

| Phase | Name | What happens |
|---|---|---|
| 0 | Validate | Join keys, hard-block rules, module dependencies |
| 1 | Variant | Apply deal-motion overrides |
| 2 | Price Book | Apply regional price overrides |
| 3 | Plan | Apply commitment-period adjustment |
| 4 | Line Items | Compute module + credit package charges |
| 5 | Overages | Compare committed quantities to entitlements |
| 6 | Discounts | Apply in `discount_application_order` |
| 7 | Minimums | True up to minimum commitment floors |
| 8 | Assemble | Sum subtotals, net total, annualize, compute TCV |

The specification also defines a **reverse-solve algorithm**: given a target price, work through available levers (discounts, plan commitment, bundles, quantity, tier downgrade) to find the configuration that hits it.

---

## Cross-Reference to value-models

The `tiers_and_modules[]` catalog in the PricingModel corresponds by name to `tiers_and_modules[]` in the [value-models](https://github.com/The-Value-Project/value-models) repo's `ValueModel` schema. This is the cross-repo join:

- The ValueModel answers: *what value does each tier unlock, and what ROI does it deliver for this customer?*
- The PricingModel answers: *what does each tier cost, and how is that price computed?*
- A `CustomerVariables` analysis recommends a tier → that tier feeds `DealConfiguration.product_selections[].tier_id`

---

## Specifications

### `spec/pricing-meta-model-spec.md` — [CC BY 4.0](LICENSE-DOCS)

Normative computation specification. Defines the 9-phase algorithm, reverse-solve algorithm, price primitive semantics, discount strategy shapes, entitlement calculation, and conformance requirements.

### `spec/pricing-page-spec.md` — [CC BY 4.0](LICENSE-DOCS)

Specifies the format of a conforming **pricing model page**: a machine-readable Markdown document wrapping a PricingModel JSON instance with front matter metadata and human-readable tables.

### `spec/pricing-model-llm-reference.md` — [CC BY 4.0](LICENSE-DOCS)

LLM interpreter instructions for the PricingModel JSON. Instructs frontier models how to apply price primitives, compute entitlements, apply discounts in order, enforce business rules, generate DealConfigurations, and run reverse-solve.

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
├── schemas/
│   ├── pricing_model.json                 PricingModel schema v1.0.0 (Apache-2.0)
│   ├── deal_configuration.json            DealConfiguration schema v1.0.0 (Apache-2.0)
│   └── invoice_statement.json             InvoiceStatement schema v1.0.0 (Apache-2.0)
├── spec/
│   ├── pricing-meta-model-spec.md         Computation specification v1.0.0 (CC BY 4.0)
│   ├── pricing-page-spec.md               Pricing page specification v1.0.0 (CC BY 4.0)
│   └── pricing-model-llm-reference.md     LLM interpreter reference v1.0.0 (CC BY 4.0)
└── examples/
    ├── acme_ai_platform_pms.json          Worked example PricingModel instance
    ├── acme_deal_config.json              Worked example DealConfiguration
    └── acme_invoice.json                  Worked example InvoiceStatement
```

---

## Versioning

| Schema / Document | Version | Status |
|---|---|---|
| `PricingModel` | 1.0.0 | Implementation-Ready |
| `DealConfiguration` | 1.0.0 | Implementation-Ready |
| `InvoiceStatement` | 1.0.0 | Implementation-Ready |
| Computation Specification | 1.0.0 | Implementation-Ready |

Versions follow `MAJOR.MINOR.PATCH` (semver). The `schema_version` field in each JSON instance must match the schema version.

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
