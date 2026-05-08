---
license: "CC-BY-4.0"
license_url: "https://creativecommons.org/licenses/by/4.0/"
license_full_text: "LICENSE-DOCS"
copyright: "Copyright 2026 The Value Project (an initiative by ValueIQ — https://valueiq.ai)"
version: "1.0.0"
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

The human-readable description serves two purposes: it allows a human reviewer to check the model for accuracy without reading raw JSON, and it gives an LLM a structured natural-language cross-reference to validate its interpretation of the JSON.

---

## Purpose

A `PricingModel` JSON instance is precise and computable, but an LLM encountering it without context may misinterpret its structure. The pricing page wraps the JSON with enough framing — metadata, a structured narrative, and a pointer to interpretation instructions — to make it reliably usable by any LLM-assisted sales, procurement, or integration workflow.

Pricing pages are intended to be:
- Published at a stable URL (e.g. `https://example.com/pricing.md` or alongside product documentation)
- Crawlable and indexable
- Referenced directly in LLM tool calls, RAG pipelines, and agent context windows

---

## Document Structure

A conforming pricing page MUST contain the following sections in order:

### 1. Front Matter

YAML front matter declaring the document type and key metadata. Required fields:

```yaml
---
document_type: pricing-model
schema_version: "1.4"
schema_ref: https://github.com/the-value-project/pricing-models/blob/main/schemas/pricing_model.json
llm_ref: https://github.com/the-value-project/pricing-models/blob/main/spec/pricing-model-llm-reference.md
vendor: <vendor name>
product: <product name>
effective_date: <ISO date>
currency: <ISO 4217 currency code>
---
```

Optional front matter fields:

```yaml
pricing_page_url: <canonical URL of this document>
contact: <sales contact email or URL>
region: <region this pricing applies to, if not global>
```

### 2. Page Title

```markdown
# [Vendor Name] [Product Name] — Machine-Readable Pricing
```

### 3. LLM Instruction Block

A clearly marked block directing an LLM to the interpreter reference before processing the JSON. MUST appear before both the human description and the JSON block.

```markdown
> **For LLMs:** This page contains a machine-readable PricingModel JSON instance conforming to
> The Value Project pricing-models standard (PMS v1.4). Before interpreting the JSON below,
> read the interpreter reference at the `llm_ref` URL in the front matter. The human-readable
> description in this document is a structured narrative summary of the JSON — use it to
> validate your interpretation of the JSON, not as a substitute for it.
```

### 4. Human-Readable Model Description

A structured narrative that describes the pricing model in plain language. This section MUST be derived directly from the JSON and MUST be kept in sync with it. A human reviewer should be able to check every statement here against the JSON.

The description MUST contain the following subsections:

#### 4a. Product Overview

One paragraph per product in `products[]`. For each product state:
- The product name and a one-sentence description of what it is
- The primary pricing metric (what customers pay per — the `unit` field on the dominant module price)
- The names and descriptions of available tiers

#### 4b. Modules

A table listing every module across all products:

| Module | Product | Tier(s) | Price | Period | Required |
|--------|---------|---------|-------|--------|----------|
| [label] | [product label] | [tier labels that include this module] | [price summary] | [period] | Yes/No |

For `tiered` or `volume` pricing, summarize the bands (e.g. "from $X to $Y depending on quantity"). For `per_unit`, state the unit.

#### 4c. Plans

A table listing every plan across all products:

| Plan | Product | Commitment | Adjustment | Targets |
|------|---------|------------|------------|---------|
| [label] | [product label] | [commitment_months] months | [adjustment.percent]% | [tier/module labels] |

#### 4d. Credit Types and Entitlements

One paragraph per credit type. State:
- The credit type name and what it measures (the `unit_label`)
- What actions consume it and at what rate (from `consumption_rules`)
- The overage policy and what it means in practice
- Where it is granted (which tiers, modules, or plans include it, and in what quantities)

#### 4e. Credit Packages

If any credit packages exist, a table:

| Package | Credit Type | Quantity | Price | Expiration | Rollover |
|---------|------------|---------|-------|------------|---------|
| [label] | [credit type label] | [quantity] | [price summary] | [expiration_months] months | [rollover_policy] |

#### 4f. Discounts

A table listing all available discounts:

| Discount | Scope | Type | Mode | Max Value | Requires Approval Over | Eligibility |
|----------|-------|------|------|-----------|----------------------|-------------|
| [label] | [scope] | [type] | [mode] | [max or strategy] | [threshold or —] | [deal motions / regions] |

#### 4g. Bundles

If any bundles exist, a table:

| Bundle | Products | Adjustment | Eligibility |
|--------|---------|------------|-------------|
| [label] | [product labels] | [percent]% | [deal motions / regions] |

#### 4h. Business Rules

A plain-English list of all business rules, grouped by enforcement level. For each rule state its `description` verbatim (these are already plain text in the JSON):

**Hard Blocks** *(configurations that are prevented)*
- [rule description]

**Warnings** *(configurations that are flagged but allowed)*
- [rule description]

**Info** *(informational)*
- [rule description]

#### 4i. Key Pricing Policies

A brief statement of:
- Discount application order (from `pricing_rules.discount_application_order`)
- Rounding policy
- How conflicting discounts in the same exclusive group are resolved
- How minimum commitments work, if any exist

---

### 5. PricingModel JSON Block

The complete, valid `PricingModel` JSON instance, fenced with the `json` language identifier:

````markdown
```json
{
  ...
}
```
````

Requirements:
- MUST validate against the `PricingModel` schema at the `schema_ref` URL
- MUST be the complete model, not a subset
- MUST use consistent `id` values throughout (all cross-references resolve within the document)
- SHOULD be pretty-printed (2-space indent) for readability

### 6. Footer

```markdown
---
*This pricing page conforms to [The Value Project](https://github.com/the-value-project)
pricing-models standard (PMS v1.4). Generated: <ISO date>.*
```

---

## Full Template

```markdown
---
document_type: pricing-model
schema_version: "1.4"
schema_ref: https://github.com/the-value-project/pricing-models/blob/main/schemas/pricing_model.json
llm_ref: https://github.com/the-value-project/pricing-models/blob/main/spec/pricing-model-llm-reference.md
vendor: Acme Corp
product: Acme AI Platform
effective_date: 2025-01-01
currency: USD
pricing_page_url: https://acmecorp.com/pricing.md
contact: sales@acmecorp.com
---

# Acme Corp Acme AI Platform — Machine-Readable Pricing

> **For LLMs:** This page contains a machine-readable PricingModel JSON instance conforming to
> The Value Project pricing-models standard (PMS v1.4). Before interpreting the JSON below,
> read the interpreter reference at the `llm_ref` URL in the front matter. The human-readable
> description in this document is a structured narrative summary of the JSON — use it to
> validate your interpretation of the JSON, not as a substitute for it.

## Product Overview

Acme AI Platform is a ... [one paragraph per product]

## Modules

| Module | Product | Tier(s) | Price | Period | Required |
|--------|---------|---------|-------|--------|----------|
| ...    | ...     | ...     | ...   | ...    | ...      |

## Plans

| Plan | Product | Commitment | Adjustment | Targets |
|------|---------|------------|------------|---------|
| ...  | ...     | ...        | ...        | ...     |

## Credit Types and Entitlements

[One paragraph per credit type]

## Credit Packages

| Package | Credit Type | Quantity | Price | Expiration | Rollover |
|---------|------------|---------|-------|------------|---------|
| ...     | ...        | ...     | ...   | ...        | ...     |

## Discounts

| Discount | Scope | Type | Mode | Max Value | Requires Approval Over | Eligibility |
|----------|-------|------|------|-----------|----------------------|-------------|
| ...      | ...   | ...  | ...  | ...       | ...                  | ...         |

## Business Rules

**Hard Blocks**
- ...

**Warnings**
- ...

**Info**
- ...

## Key Pricing Policies

[Brief statements on discount order, rounding, exclusive group resolution, minimums]

## Pricing Model

'''json
{
  ...PricingModel JSON...
}
'''

---
*This pricing page conforms to [The Value Project](https://github.com/the-value-project)
pricing-models standard (PMS v1.4). Generated: 2025-01-01.*
```

*(Replace `'''` with triple backticks in actual documents.)*

---

## Conformance

A pricing page conforms to this specification if:

- [ ] Front matter is present and contains all required fields
- [ ] `document_type` is exactly `pricing-model`
- [ ] `llm_ref` points to a valid LLM interpreter reference
- [ ] The LLM instruction block appears before the human description and JSON
- [ ] All required human description subsections are present
- [ ] Business rule descriptions are stated verbatim from the JSON
- [ ] The JSON block contains a complete, valid `PricingModel` instance
- [ ] All `id` cross-references within the JSON resolve correctly
- [ ] The footer is present

---

## Notes for Publishers

**Keeping the description in sync:** The human-readable description is derived from the JSON and must be updated whenever the JSON changes. Treat them as a single artifact. An LLM generating a pricing page from a `PricingModel` instance should produce both simultaneously.

**Multiple regions:** Publish one pricing page per region, or use the `price_books` array in the PricingModel for regional overrides in a single document.

**Multiple products:** If a vendor has multiple products with separate pricing models, publish a separate pricing page per product.

**Discoverability:** Link to your pricing page from your main pricing page and sitemap. Consider adding a `<link rel="alternate" type="text/markdown">` tag in your HTML pricing page pointing to the `.md` version.

---
*License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · Copyright 2026 The Value Project (an initiative by [ValueIQ](https://valueiq.ai)) · Part of [The Value Project](https://github.com/The-Value-Project/pricing-models)*
