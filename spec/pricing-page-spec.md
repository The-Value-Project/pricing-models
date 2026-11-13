---
license: "CC-BY-4.0"
license_url: "https://creativecommons.org/licenses/by/4.0/"
license_full_text: "LICENSE-DOCS"
copyright: "Copyright 2026 The Value Project (an initiative by ValueIQ — https://valueiq.ai)"
version: "3.0.0"
repo: "https://github.com/The-Value-Project/pricing-models"
related_schema: "https://github.com/The-Value-Project/pricing-models/blob/main/schemas/pricing_model.json"
related_llm_reference: "https://github.com/The-Value-Project/pricing-models/blob/main/spec/pricing-model-llm-reference.md"
related_value_page_spec: "https://github.com/The-Value-Project/value-models/blob/main/spec/value-page-spec.md"
part_of: "The Value Project — https://github.com/The-Value-Project"
---

# Pricing Page Specification

**The Value Project — pricing-models**

This document specifies the structure of a machine-readable pricing page that publishes a vendor's `PricingModel` JSON in a form that both humans and LLMs can reliably read, verify, and reason about.

A conforming pricing page is a Markdown document containing:
1. A structured front matter header
2. A structured human-readable model description
3. The complete `PricingModel` JSON in a fenced code block
4. A link to the LLM interpreter reference

---

## Purpose and Narrative Design Principles

The human-readable description serves three readers simultaneously:

- **A prospective buyer** who wants to understand what they are buying and what it costs
- **A human reviewer** who wants to verify the JSON is correctly encoded without reading raw JSON
- **An LLM** that wants a structured natural-language cross-reference to anchor its interpretation of the JSON

All three are served by the same narrative: one that covers the *shape* of the model clearly, surfaces the *key numbers and constraints* that matter for purchasing decisions, and is structured enough that a reviewer can spot an encoding error — without duplicating every field of every object.

**The narrative is not a parallel rendering of the JSON.** It is a summary a buyer can act on and a reviewer can check against. The JSON is the authoritative source of truth; the narrative is its human-readable verification layer.

**Design rules for narrative authors:**

- Write for a reader who is considering a purchase or checking an encoding — not for a reader reconstructing the JSON.
- Surface numbers that matter: prices, quantities, key limits, discount ceilings. Do not surface every field.
- Cross-reference between products where content is genuinely shared (e.g. shared credit types, shared discounts, shared business rules). Do not repeat shared content in full under each product — note that it is shared and point to where it is defined.
- Conditional sections (marked *conditional*) are omitted entirely — no heading, no content — when their source array is absent or empty.
- Resolve all IDs to labels in the narrative. IDs appear only in the JSON block.
- Render adjustment percentages to a maximum of 2 decimal places with trailing zeros removed and sign always included (e.g. "0%", "-15%", "-26.53%").

---

## Document Structure

---

### 1. Front Matter

YAML front matter declaring the document type and key metadata. Required fields:

```yaml
---
document_type: pricing-model
schema_version: "2.0.0"
model_id: <the PricingModel model_id>
schema_ref: https://github.com/the-value-project/pricing-models/blob/main/schemas/pricing_model.json
llm_ref: https://github.com/the-value-project/pricing-models/blob/main/spec/pricing-model-llm-reference.md
vendor: <vendor name; equals vendor_name when that is not null>
product: <product name or "Multiple" if more than one product>
effective_date: <ISO date, or null; equals effective_date in the JSON>
currency: <ISO 4217 currency code; equals currency in the JSON>
---
```

`schema_version`, `model_id`, `effective_date` and `currency` MUST equal the same fields in the JSON block (§5). The JSON wins if they differ. `model_id` is what a `DealConfiguration` uses to refer to the published page.

Optional front matter fields:

```yaml
pricing_page_url: <canonical URL of this document>
contact: <sales contact email or URL>
region: <region this pricing applies to, if not global>
```

---

### 2. Page Title

```markdown
# [Vendor Name] [Product Name] — Machine-Readable Pricing
```

For multi-product models: `# [Vendor Name] — Machine-Readable Pricing`

---

### 3. LLM Instruction Block

Emit verbatim:

```markdown
> **For LLMs:** This page contains a machine-readable PricingModel JSON instance conforming to
> The Value Project pricing-models standard (PMS v2.0.0). Before interpreting the JSON below,
> read the interpreter reference at the `llm_ref` URL in the front matter. The human-readable
> description in this document is a structured narrative summary of the JSON — use it to
> validate your interpretation of the JSON, not as a substitute for it.
```

---

### 4. Human-Readable Model Description

The description is structured as follows:

- **§4a Model Overview** — one section covering the whole model: what products exist, how they relate, and any shared infrastructure (shared credit types, shared discounts, shared business rules).
- **§4b–4e Per-product sections** — one section per product covering that product's tiers, modules, commitment plans, and product-specific rules. Cross-reference shared content rather than repeating it.
- **§4f–4m Model-level sections** — sections that span all products: discounts, discount strategies, business rules, pricing relationships, key policies, credit types and packages, bundles, and the comparison grid. These appear once, after all per-product sections, in letter order.

**Order.** Products, modules, tiers, commitment plans and comparison-grid rows and cells are listed in `position` order when their `position` values are non-null, and in array order when they are null. `position` is for display only.

If the model contains only one product, §4a is a single introductory paragraph and the per-product section header may be omitted.

---

#### 4a. Model Overview

One paragraph covering:
- How many products are in this model and their names
- Whether products share a credit system, a discount structure, or business rules — and if so, a brief statement of what is shared
- Any cross-product relationships that a buyer should be aware of before reading the individual product sections (e.g. mutual exclusion, bundling, upgrade paths across products)

For single-product models: one paragraph stating what the product is, its pricing model type (flat subscription, per-unit, credit-based consumption, or a combination), and a brief orientation to the tier structure.

---

#### Per-Product Sections

For each product in `products[]`, emit a level-2 heading:

```markdown
## [Product Label]
```

Then the following subsections in order.

---

##### 4b. [Product Label] — Tiers

The primary human-readable reference for what each tier includes, what it costs, and what limits apply.

A table with one row per tier. Columns are fixed plus one column per credit type that appears in any tier's `included_credit_grants` for this product:

| Tier | Price | Billing | Overage Policy | [Credit Type 1] | [Credit Type 2] | … |
|------|-------|---------|----------------|-----------------|-----------------|---|

- **Tier:** the tier's `label`
- **Price:** the list price of the tier before any commitment plan, bundle or discount. The tier's priced modules are the modules in `included_modules` plus every module with `required: true`, each once. Group them by `price.period`, and write one group per period in the order Monthly, Quarterly, Annual, One-time, separated by " + ". Within a group:
  - the sum of the non-null `amount` of its `flat` modules, as "$X / month", "$X / quarter", "$X / year", or "$X one-time". A sum of 0 is "$0 / month".
  - for each `per_unit` module with a non-null `amount`: "$A / [unit]", where the unit is the `unit_label` of the credit type that `price.credit_type_id` names.
  - for each `tiered` module: "[Module label]: tiered pricing". For each `volume` module: "[Module label]: volume pricing". Their bands are in the JSON.
  - for each `flat` or `per_unit` module with a null `amount`: "[Module label]: contact sales". A tier whose only priced modules have a null `amount` shows "Contact sales".
  - If the tier has no priced module, "—".
  Example: "$49 / month + $5 / seat + API calls: tiered pricing".
- **Billing:** the distinct periods of the tier's priced modules, normalised, in the order Monthly, Quarterly, Annual, One-time, separated by ", ".
- **Overage Policy:** the tier's `overage_policy` in plain English: `pay_as_you_go` → "Pay as you go"; `hard_cap` → "Hard cap"; `throttle` → "Throttled"; `contact_sales` → "Contact sales"; `unknown` → "Not stated"
- **[Credit Type columns]:** one column per credit type that appears in any tier's `included_credit_grants`. For each tier × credit type cell, state the grant in compact form:
  - `consumable` grant: "[quantity] / [period]" (e.g. "4,000 / month"). `-1` → "Unlimited".
  - `capacity` grant: "[quantity]" with a note that this is a concurrent limit, e.g. "10,000 students". `-1` → "Unlimited".
  - `cumulative` grant: "[quantity] (cumulative)".
  - `one_time` grant: "[quantity] (once)".
  - A grant whose `renewal_behavior`, `period` or `metric_type` is `unknown`: "[quantity] (terms not stated)".
  - No grant for this credit type: "—".
  - Multiple grants for same credit type: list each on a separate line within the cell.

**Reviewer note:** The credit type column headers and cell values must be verifiable against `tiers[].included_credit_grants` in the JSON. A reviewer checks that every non-empty cell matches a grant entry for that tier and credit type.

---

##### 4c. [Product Label] — Commitment plans *(conditional)*

Omit if this product has no commitment plans.

One paragraph describing the available billing commitment options and their effect on price. State:
- The available commitment periods and the price adjustment each delivers (e.g. "Annual billing reduces the monthly equivalent by 25%")
- Which tiers the commitment plans apply to
- Any credit grants included with a commitment plan (if present)
- The minimum commitment in months, or "no minimum stated" if `commitment_months` is null
- Which tiers the commitment plan is preselected for (`default_for_tier_ids`), if any

Do not use a table unless there are four or more commitment plans with meaningfully different structures. For simple annual/monthly pairs, prose is clearer.

---

##### 4d. [Product Label] — Add-ons *(conditional)*

Omit if this product has no modules that are not included in any tier (i.e. no add-ons).

A brief paragraph followed by a compact table. The paragraph names the available add-ons and who can purchase them (derived from `module_dependencies`). The table covers:

| Add-on | Price | Period | Requires |
|--------|-------|--------|---------|

- **Add-on:** the module's `label`
- **Price:** the module's price written as in §4b: flat "$X", `per_unit` "$A / [unit]", `tiered` "tiered pricing", `volume` "volume pricing". A null amount on a flat or `per_unit` price is "Contact sales". Zero is "$0".
- **Period:** normalised period ("Monthly", "One-time")
- **Requires:** the tier(s) or module(s) this add-on requires, resolved from `module_dependencies`. If no dependency is recorded, write "—".

---

##### 4e. [Product Label] — Notes *(conditional)*

Omit if there is nothing product-specific to note beyond what is covered in §4b–4d.

A short paragraph covering any product-specific context a buyer needs that is not captured in the structured sections above — for example: trial availability, upgrade/downgrade flexibility, a custom negotiation requirement for a specific tier, or an encoding ambiguity flagged in the model. Keep this to three sentences or fewer. Do not repeat content already in §4b–4d or in the model-level sections.

---

#### Model-Level Sections

These sections appear once, after all per-product sections. They cover content that spans products or applies to the model as a whole.

---

#### 4f. Discounts *(conditional)*

Omit if `discounts[]` is empty.

A table with one row per discount:

| Discount | Applies To | Type | Mode | Maximum | Approval Threshold | Stackable | Eligible For |
|----------|-----------|------|------|---------|-------------------|-----------|-------------|

- **Discount:** the discount's `label`
- **Applies To:** the product(s), module(s), or scope this discount targets, in plain language (e.g. "Enterprise subscription module", "Contract total", "Credits only")
- **Type:** "Percentage" or "Flat amount"
- **Mode:** "Manual (salesperson-set)" or "Strategy-driven ([strategy label])"
- **Maximum:** for manual: `manual.max_value` if non-null, otherwise "Not disclosed". For strategy-driven: "Computed — see strategy"
- **Approval Threshold:** `manual.approval_required_over` if non-null, otherwise "—"
- **Stackable:** "Yes" or "No". If in an exclusive group, append the group name.
- **Eligible For:** comma-separated deal motions and/or regions; "All" if unrestricted

---

#### 4g. Discount Strategies *(conditional)*

Omit if `discount_strategies[]` is empty.

One paragraph per strategy. Each paragraph states the strategy name, what input it reads, and in plain English what it computes — enough for a reviewer to verify the shape is correctly encoded and for a buyer to understand how the discount is determined. Reference which discount(s) use this strategy.

---

#### 4h. Business Rules

Always present. Grouped by enforcement level in this order: hard blocks first, then warnings, then info. Omit a group heading if no rules exist at that level.

**Hard Blocks** *(configurations that are prevented)*
- [rule `description` verbatim]

**Warnings** *(configurations that are flagged but allowed)*
- [rule `description` verbatim]

**Info** *(informational)*
- [rule `description` verbatim]

**Cross-product note:** If a business rule applies to all products or to cross-product configurations, it appears here once. Do not repeat business rules in per-product Notes sections.

---

#### 4i. Pricing Relationships *(conditional)*

Omit if `pricing_relationships[]` is empty.

A brief paragraph or compact table covering the relationships between products, tiers, or modules in this model. Focus on relationships that a buyer needs to understand to configure a valid deal: mutual exclusions, upgrade paths, credit sharing, entitlement pooling. Skip relationships that are self-evident from the tier structure.

If the model has four or fewer relationships, a short paragraph is preferred over a table. If five or more, use a table:

| Relationship | Type | Description |
|-------------|------|-------------|

- **Relationship:** Subject → Related To (resolved to labels)
- **Type:** plain-English relationship type
- **Description:** the `description` field verbatim

---

#### 4j. Key Pricing Policies

Always present. A bullet list covering the operational rules of the pricing engine. Emit one bullet per field present in `pricing_rules`; omit if absent or null:

- **Calculation:** always the statement "Prices are calculated in the nine phases of the Pricing Calculation Specification, in a fixed order. The model does not set it." with a link to the specification. If `pricing_rules.calculation_order` is non-empty, add "The deprecated `calculation_order` field is present and is ignored."
- **Discount application order:** ordered list of discount labels from `pricing_rules.discount_application_order`; if empty, "No discounts defined"
- **Rounding:** `mode`, `currency_minor_units` and `method` from `pricing_rules.rounding`; "No rounding" if `rounding` is null
- **Exclusive group resolution:** what happens when discounts in the same exclusive group conflict
- **Ineligible selections:** behaviour from `pricing_rules.policy.ineligible_selection_handling`
- **Missing strategy inputs:** behaviour from `pricing_rules.policy.missing_strategy_inputs_handling`

---

#### 4k. Credit Types and Packages *(conditional)*

Omit if `credit_types[]` and `credit_packages[]` are both empty.

A table of credit types, then, if `credit_packages[]` is non-empty, a table of packages.

| Credit Type | Unit | Overage Policy | Overage Price | Consumption Rules |
|-------------|------|----------------|---------------|-------------------|

- **Credit Type:** the credit type's `label`
- **Unit:** `unit_label`
- **Overage Policy:** in plain English, as in §4b
- **Overage Price:** `overage_price` written as in §4b, "$A / [unit]" for a `per_unit` price; "—" if null
- **Consumption Rules:** one line per entry in `consumption_rules[]`: "[action]: [credits_per_unit] per unit", followed by `conditions` verbatim in parentheses when it is non-null. "—" if there are none.

| Package | Credit Type | Quantity | Price | Expires | Rollover |
|---------|-------------|----------|-------|---------|----------|

- **Package:** the package's `label`
- **Credit Type:** the `label` of the credit type that `credit_type_id` refers to
- **Quantity:** `quantity`, with the credit type's `unit_label`
- **Price:** apply the price rules in §4d
- **Expires:** "[expiration_months] months", or "Not stated" if null
- **Rollover:** `none` → "None"; `partial` → "Partial ([rollover_percent]%)"; `full` → "Full"; `unknown` → "Not stated"

**Reviewer note:** every row must be verifiable against `credit_types[]` and `credit_packages[]` in the JSON.

---

#### 4l. Bundles *(conditional)*

Omit if `bundles[]` is empty.

| Bundle | Products | Adjustment | Included Credits | Eligible For |
|--------|----------|------------|------------------|--------------|

- **Bundle:** the bundle's `label`
- **Products:** the `label` of each product in `product_ids`, comma-separated
- **Adjustment:** `adjustment.percent` as stored, with its sign (for example "-10%")
- **Included Credits:** each entry in `included_credit_grants[]` in the compact form used in §4b; "—" if there are none
- **Eligible For:** as in §4f

---

#### 4m. Comparison Grid *(conditional)*

Omit if `comparison_grid[]` is empty.

One table per product that has rows. The heading row is "Item" followed by the product's tiers (their `label`). The grid is descriptive: it is never a second source of price truth, and calculation does not read it.

| Item | [Tier 1] | [Tier 2] | … |
|------|----------|----------|---|

- **Item:** the row's `label`. Rows with the same `section` are grouped under it as a sub-heading. Rows with a null `section` come first, with no sub-heading.
- **Cell:** by `state`. `structured`: `value`, where `true` is "Yes" and `false` is "No". `free_text`: `text` verbatim. `not_available`: "—". A tier with no cell for a row is also "—".

**Reviewer note:** every cell must be verifiable against `comparison_grid[].cells[]` in the JSON.

---

### 5. PricingModel JSON Block

Heading: `## Pricing Model`

The complete, sanitised `PricingModel` JSON instance, fenced with the `json` language identifier.

Requirements:
- **Unwrapped:** top-level keys are `products`, `bundles`, `discounts`, etc. If the source JSON has a wrapper object (e.g. `{"version": "...", "pricing_model": {...}}`), emit only the inner object.
- **Sanitised:** at the root, every field is kept, because the standard is extensible. Below the root, only fields the schema defines are kept. The generator MUST NOT drop a field silently. If it dropped any, the line `Dropped fields: ` followed by the dropped fields as RFC 6901 JSON Pointers, comma-separated, MUST appear immediately after the JSON block. Identity fields (`schema_version`, `model_id`, `vendor_name`, `effective_date`, `currency`) are schema fields and are always kept.
- **Complete:** the full model, not a subset.
- **Pretty-printed:** 2-space indent.
- **Cross-references intact:** all ids resolve within the document, as the reference rules in `$defs/referential_rules` of `schemas/pricing_model.json` require.
- **Valid:** it validates against `schemas/pricing_model.json`.

---

### 6. Footer

Emit verbatim, substituting the generated date:

```markdown
---
*This pricing page conforms to [The Value Project](https://github.com/the-value-project)
pricing-models standard (PMS v2.0.0). Generated: <ISO date>.*
```

---

## Section Reference

| Section | Source | Always / Conditional |
|---------|--------|---------------------|
| 4a Model Overview | `products[]` (all) | Always |
| 4b Tiers | `products[n].tiers[]`, `included_credit_grants` | Always (per product) |
| 4c Commitment plans | `products[n].commitment_plans[]` | Conditional (per product) |
| 4d Add-ons | modules not in any tier's `included_modules` | Conditional (per product) |
| 4e Notes | product-specific context | Conditional (per product) |
| 4f Discounts | `discounts[]` | Conditional |
| 4g Discount Strategies | `discount_strategies[]` | Conditional |
| 4h Business Rules | `business_rules[]` | Always |
| 4i Pricing Relationships | `pricing_relationships[]` | Conditional |
| 4j Key Pricing Policies | `pricing_rules` | Always |
| 4k Credit Types and Packages | `credit_types[]`, `credit_packages[]` | Conditional |
| 4l Bundles | `bundles[]` | Conditional |
| 4m Comparison Grid | `comparison_grid[]` | Conditional |

**Not surfaced in the narrative (present in JSON only):** `variants[]`, `price_books[]`, `minimum_commitments[]`, `module_dependencies[]`, `conformance_profile` (dependency information is surfaced in §4d Add-ons rather than as a standalone section). These arrays are present and complete in the JSON block and are interpretable via the LLM reference.

---

## Conformance

A pricing page conforms to this specification if:

- [ ] Front matter is present and contains all required fields
- [ ] `document_type` is exactly `pricing-model`
- [ ] `llm_ref` points to a valid LLM interpreter reference
- [ ] The LLM instruction block appears before the narrative and JSON block
- [ ] §4a Model Overview is present
- [ ] A per-product section exists for each entry in `products[]`
- [ ] §4b Tiers table is present for each product and correctly reflects `included_credit_grants` at the tier level
- [ ] §4h Business Rules is present and descriptions are verbatim
- [ ] §4j Key Pricing Policies is present
- [ ] Conditional sections are present for non-empty arrays and absent for empty arrays
- [ ] The JSON block is present, unwrapped, sanitised, and complete
- [ ] The JSON block validates against `schemas/pricing_model.json`
- [ ] Front-matter `schema_version`, `model_id`, `effective_date` and `currency` equal the JSON's, and `vendor` equals `vendor_name` when that is not null
- [ ] All ids in the JSON resolve, as `$defs/referential_rules` requires
- [ ] Items are listed in `position` order, or in array order where `position` is null
- [ ] Any field the generator dropped is listed after the JSON block
- [ ] The footer is present

---

## Changes from v2.0.0

This is a MAJOR version: a page written to 2.0.0 does not conform to 3.0.0. It targets schemas 2.0.0.

| Change | Reason |
|--------|--------|
| §4b Price is defined for every price type, with an example. Billing lists the distinct periods | The 2.0.0 rule summed `price.amount` whatever the type. It mixed unit prices with flat charges, showed a fully priced `tiered` tier as "Contact sales", and used "dominant" without defining it |
| §4j states the calculation order as fixed and links the specification. Rounding names `mode`, `currency_minor_units` and `method` | `calculation_order` is deprecated, and the phase order is fixed by the specification. "Precision" matched no field |
| Added §4k Credit Types and Packages, §4l Bundles and §4m Comparison Grid | These arrays had no narrative section, so a reviewer could not check credit-type semantics, bundle adjustments or the grid without reading the JSON |
| §4c lists the minimum commitment and the tiers a commitment plan is preselected for. Unknown grant terms read "terms not stated" | New schema fields: nullable `commitment_months`, `default_for_tier_ids`, and `unknown` enum values |
| Front matter requires `model_id` and `schema_version: "2.0.0"`, and its values must equal the JSON's | A `DealConfiguration` could not refer to a published page, and the identity fields were stripped from the JSON block |
| §5: the root keeps every field, other fields below it are kept only if the schema defines them, and every dropped field is listed after the JSON block | Silent dropping contradicted the schema's `additionalProperties: true` and broke the no-silent-defaults principle |
| Conformance adds: JSON validates against the schema, front matter equals the JSON, ids resolve, items are in `position` order, dropped fields are listed | The checklist left out checks that the specification already implied |
| Items are listed in `position` order | `position` is the order signal in the schema |
| The front-matter example, LLM instruction block and footer name `schema_version: "2.0.0"` / "PMS v2.0.0" | They said "1.4", which was never a published version. Pages published with "1.4" should change it to the schema version they target |
| Corrected the v1.0.0 change list below | It listed a "Module Type column" and an "adjustment percent rounding rule" that the specification never contained |

## Changes from v1.0.0

| Change | Reason |
|--------|--------|
| Added narrative design principles | v1 had no guidance on what level of detail the narrative should contain; authors over-specified |
| Restructured as model overview + per-product sections + model-level sections | v1 was flat; multi-product models had no clear structure |
| Added §4b Tiers and Entitlements table (per product) | v1 had no structured surface for per-tier entitlement quantities |
| Added §4d Add-ons subsection | v1 could not distinguish base modules from add-ons |
| Replaced §4c Modules table with §4d Add-ons subsection | Full module table was too detailed for the narrative's purpose; add-ons are what a buyer needs to see |
| Changed §4c Plans from table to prose-preferred | Simple annual/monthly plans are clearer in prose; table reserved for complex plan structures |
| Added §4e Product Notes subsection | Provides a home for product-specific context without polluting structured sections |
| Added §4g Discount Strategies section | Entirely absent in v1 |
| Added §4i Pricing Relationships section | Entirely absent in v1 |
| Removed standalone Module Dependencies section | Dependency information folded into §4d Add-ons where it is buyer-relevant |
| Removed standalone Minimum Commitments section | Present in JSON; not surfaced in narrative (rarely buyer-facing in the way the narrative addresses) |
| Removed standalone Variants and Price Books sections | Present in JSON; not surfaced in narrative (deal-motion and regional overrides are computed at deal time) |
| Added cross-referencing guidance | v1 implied all content repeated per product; shared content should be noted once |
| Added JSON sanitisation and unwrapping requirements | v1 said "emit exactly as received" — too loose |

---
*License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · Copyright 2026 The Value Project (an initiative by [ValueIQ](https://valueiq.ai)) · Part of [The Value Project](https://github.com/The-Value-Project/pricing-models)*
