# Changelog — pricing-models

> License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · Part of [The Value Project](https://github.com/The-Value-Project/pricing-models)

All notable changes to the `pricing-models` schemas and specifications are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). Versions follow `MAJOR.MINOR.PATCH` (semver). Breaking changes increment MAJOR.

---

## [Unreleased]

*No unreleased changes.*

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
