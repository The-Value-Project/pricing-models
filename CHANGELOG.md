# Changelog — pricing-models

> License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · Part of [The Value Project](https://github.com/The-Value-Project/pricing-models)

All notable changes to the `pricing-models` schemas and specifications are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). Versions follow `MAJOR.MINOR.PATCH` (semver). Breaking changes increment MAJOR.

---

## [Unreleased]

### Changed — `schemas/pricing_model.json`

Not a breaking change: the set of valid `PricingModel` documents is unchanged.

- Factored the three shapes that were repeated inline into `$defs`: `price` (6 sites), `credit_grant` (the item of `included_credit_grants[]`, 5 sites) and `eligibility` (6 sites). Each site is now a `$ref`. All 17 copies were identical before the change. Code generated from the schema will show one named type in place of several anonymous ones; that is not a change in what validates.
- Technique and credit: the Currv Pricing Model Schema (CPMS) v1.0 merged-model proposal defines its shared shapes the same way.

### Changed (breaking) — `plans` renamed to `commitment_plans`

Part of the planned 2.0.0 MAJOR release. A clean break, with no alias. See `spec/migration-2.0.0.md`.

- `PricingModel`: `products[].plans[]` is now `products[].commitment_plans[]`. In the schema, a "plan" meant a commitment-period option (annual, monthly). In most pricing usage a "plan" is what this standard calls a tier, so the old name led readers to the wrong object.
- `InvoiceStatement`: the `adjustments[].adjustment_type` value `plan_adjustment` is now `commitment_plan_adjustment`.
- `DealConfiguration`: `billing.plan_id` keeps its name. It now refers to `products[].commitment_plans[].id`.
- `README.md`, `spec/pricing-page-spec.md` (§4c is now "Commitment plans") and `spec/pricing-model-llm-reference.md` use the new name.
- Source: the Currv Pricing Model Schema (CPMS) v1.0 merged-model proposal already uses `commitment_plans`, and its mapping tables record the clash.

---

## [2.0.0] — 2026-05-20

### Changed — `spec/pricing-page-spec.md` v2.0.0

License: CC BY 4.0

Breaking change: the human-readable narrative structure has been redesigned. Pricing pages conforming to v1.0.0 do not conform to v2.0.0.

**Narrative restructure**

- Replaced the flat section sequence with a three-level structure: model overview → per-product sections → model-level sections. Each product in `products[]` now has its own named section (`## [Product Label]`) containing Tiers, Plans, Add-ons, and Notes subsections.
- Added explicit narrative design principles stating the three intended readers (buyer, reviewer, LLM) and requiring that the narrative summarise and orient rather than duplicate the JSON.
- Added cross-referencing guidance: shared credit types, discounts, and business rules are described once at the model level and noted as shared in per-product sections rather than repeated.

**New and changed sections**

- Added `§4a Model Overview` — one paragraph orienting the reader to the full model before per-product sections.
- Added `§4b Tiers` (per product) — replaces the v1 flat Modules table as the primary human-readable reference. A table with one row per tier and one column per credit type present in any tier's `included_credit_grants`, surfacing entitlement quantities and metric types (consumable, capacity, cumulative, one-time) inline. Overage policy included per tier.
- Added `§4c Plans` (per product, conditional) — prose-preferred for simple annual/monthly pairs; table for four or more structurally distinct plans.
- Added `§4d Add-ons` (per product, conditional) — compact table of modules not included in any tier, with dependency requirements resolved to labels. Replaces the full Modules table for non-base modules.
- Added `§4e Notes` (per product, conditional) — short paragraph for product-specific context not captured in structured sections (trial availability, upgrade flexibility, encoding ambiguities).
- Added `§4g Discount Strategies` (model-level, conditional) — prose section describing each strategy's input metric and computation shape. Absent from v1.
- Added `§4i Pricing Relationships` (model-level, conditional) — prose or table of relationships from `pricing_relationships[]`. Absent from v1.
- Revised `§4f Discounts` — added Stackable and Applies To columns; Mode column now distinguishes manual from strategy-driven with strategy label resolved.
- Revised `§4e Credit Types` — prose now explicitly states `metric_type` in plain English for each credit type; entitlement quantities removed (covered in §4b Tiers).
- Removed standalone Modules table — module detail is now split between the Tiers table (base modules via entitlements) and the Add-ons subsection.
- Removed standalone Module Dependencies section — dependency information folded into the Add-ons subsection (§4d) where it is buyer-relevant.
- Removed standalone Minimum Commitments, Variants, and Price Books sections from the narrative — these remain present and complete in the JSON block and are interpretable via the LLM reference. Added a Section Reference table documenting which arrays are narrative-surfaced and which are JSON-only.

**JSON block requirements tightened**

- JSON block must be the unwrapped model object: top-level keys are `products`, `bundles`, etc. Wrapper objects (e.g. `{"version": "...", "pricing_model": {...}}`) must be unwrapped before emission.
- JSON block must be sanitised: only fields defined in the schema's `properties` allowlists at every level. Extra fields are silently dropped.
- Both requirements were absent from v1.

**Other**

- Added adjustment percentage display rule: render to maximum 2 decimal places, trailing zeros removed, sign always included.
- Added multi-product front matter guidance: `product` field set to "Multiple" when `products[]` contains more than one entry.
- Added Section Reference table mapping each narrative section to its source JSON field(s) and always/conditional status.
- Added Changes from v1.0.0 table.

---

## [1.0.0] — 2026-05-07

### Added — Repository structure

- `LICENSE` — dual-license overview (schemas: Apache-2.0; docs/specs: CC BY 4.0)
- `LICENSE-CODE` — Apache License 2.0 full text (applies to `schemas/`)
- `LICENSE-DOCS` — Creative Commons Attribution 4.0 full text (applies to `spec/`, `examples/`, docs)
- `CONTRIBUTING.md` — contribution guide with license terms for contributors
- `CHANGELOG.md` — this file

### Added — `PricingModel` schema v1.0.0 (`schemas/pricing_model.json`)

License: Apache-2.0

- `schema_version` field (`const: "1.0.0"`)
- `model_id` — stable unique identifier, referenced by `DealConfiguration.model_reference.model_id`
- `$id`, `x-version`, `x-license`, `x-related-schemas`, `x-spec` — license header and cross-repo references
- `products[]` with `modules[]` (four price primitives: flat, per_unit, tiered, volume), `tiers[]` (sets of included module_ids), `plans[]` (percentage adjustments)
- `bundles[]` — multi-product bundles with adjustment percentages
- `discounts[]` — manual and strategy-driven discounts
- `credit_types[]` — generic entitlement pool definitions with `consumption_rules` and `overage_policy`; all entitlements use this pattern, no hardcoded fields
- `included_credit_grants[]` with `period` and `metric_type` fields on tiers, modules, plans, bundles
- `credit_packages[]` — purchasable credit blocks
- `discount_strategies[]` — parameterized discount functions: `step_tiers`, `linear_ramp`, `piecewise_linear`, `lookup_table`
- `price_books[]` — regional price override tables
- `variants[]` — deal-motion-specific overrides (new_logo, renewal, expansion, reprice)
- `minimum_commitments[]` — minimum spend floors
- `pricing_rules` — computation config: `discount_application_order`, rounding, tax policy
- `business_rules[]` — plain-text constraints with `rule_type`, `enforcement` (hard_block | warning | info), self-contained `description`
- `module_dependencies[]` — module dependency graph
- `pricing_relationships[]` — cross-product rules

Cross-repo join: `products[].tiers[].name` corresponds to `ValueModel.tiers_and_modules[].name` in the [`value-models`](https://github.com/The-Value-Project/value-models) repo.

### Added — `DealConfiguration` schema v1.0.0 (`schemas/deal_configuration.json`)

License: Apache-2.0

- `schema_version` field (`const: "1.0.0"`)
- `config_id` — stable unique identifier, referenced by `InvoiceStatement.config_id`
- `model_reference.model_id` — references `PricingModel.model_id`
- `$id`, `x-version`, `x-license`, `x-related-schemas`
- `deal_motion` — new_logo | renewal | expansion | reprice
- `product_selections[]` with `quantities[]` (`quantity_type`: committed | estimated | maximum | starting, with `growth_schedule`), `credit_package_selections[]`
- `bundle_selections[]`, `discount_selections[]`
- `negotiated_overrides` — `price_overrides[]`, `credit_grant_overrides[]`, `custom_terms[]`

### Added — `InvoiceStatement` schema v1.0.0 (`schemas/invoice_statement.json`)

License: Apache-2.0

- `schema_version` field (`const: "1.0.0"`)
- `config_id` / `model_id` — references `DealConfiguration.config_id` and `PricingModel.model_id`
- `$id`, `x-version`, `x-license`, `x-related-schemas`, `x-spec`
- `line_items[]` with `graduated_detail[]` (band-level breakdown for tiered/volume), `computation_method` (human-readable trace), `source_fields[]` (JSON paths for full audit trail)
- `adjustments[]` with `adjustment_type` and `source` identifying the PricingModel object
- `totals` — `net_total`, `annualized_total`, `total_contract_value`
- `entitlement_summary[]` — per credit_type: granted / committed_or_used / overage / overage_cost
- `warnings[]` — error | warning | info

### Added — Specifications

License: CC BY 4.0

- `spec/pricing-meta-model-spec.md` v1.0.0 — normative computation specification: 9-phase deterministic evaluation algorithm (Validate → Variant → Price Book → Plan → Line Items → Overages → Discounts → Minimums → Assemble), reverse-solve algorithm, price primitive semantics, discount strategy shapes, entitlement calculation, business rule enforcement, conformance checklist, cross-reference to value-models repo
- `spec/pricing-page-spec.md` v1.0.0 — specification for machine-readable pricing pages: YAML front matter format, human-readable description structure (modules table, tiers table, plans table, credit types, discounts, business rules by enforcement level), PricingModel JSON block, `llm_ref` pointer requirement
- `spec/pricing-model-llm-reference.md` v1.0.0 — LLM interpreter reference: instructions for applying price primitives, computing entitlements, applying discounts in declared order, enforcing business rules, generating DealConfigurations, running reverse-solve, connecting to value-models repo

All spec files include license front matter (YAML) and inline license notices.

---

*Changelog for [pricing-models](https://github.com/The-Value-Project/pricing-models) · Part of [The Value Project](https://github.com/The-Value-Project)*
