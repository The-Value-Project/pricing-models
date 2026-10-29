---
license: "CC-BY-4.0"
license_url: "https://creativecommons.org/licenses/by/4.0/"
license_full_text: "LICENSE-DOCS"
copyright: "Copyright 2026 The Value Project (an initiative by ValueIQ — https://valueiq.ai)"
version: "2.0.0"
status: "Draft until the 2.0.0 release"
targets_schema_version: "2.0.0"
repo: "https://github.com/The-Value-Project/pricing-models"
related_schema: "https://github.com/The-Value-Project/pricing-models/blob/main/schemas/pricing_model.json"
related_llm_reference: "https://github.com/The-Value-Project/pricing-models/blob/main/spec/pricing-model-llm-reference.md"
related_page_spec: "https://github.com/The-Value-Project/pricing-models/blob/main/spec/pricing-page-spec.md"
part_of: "The Value Project — https://github.com/The-Value-Project"
---

# Pricing Calculation Specification

**The Value Project — pricing-models standard. Specification 2.0.0 for schemas 2.0.0. Draft until the 2.0.0 release.**

This is the normative specification of the calculation that turns a `PricingModel` and a `DealConfiguration` into an `InvoiceStatement`. The schemas say what the documents look like. This document says what an engine does with them. The words MUST, MUST NOT and MAY are used in their usual normative sense.

Where this specification goes beyond what the schemas and earlier documents state, the passage carries a drafting note ([DN-n]). Annex D lists them. They are the places to review first.

---

## 1. Scope

PMS computes a **quote-time price** for a **configured deal**. Given a vendor's `PricingModel` and a `DealConfiguration` of selected products, quantities and terms, it produces a deterministic `InvoiceStatement`.

The deterministic part is calculating a price from a model and a configuration. Business rules are text for humans, LLMs and a product's own mechanical checks, and they sit outside that calculation (section 7.1).

PMS does not meter or aggregate usage, prorate partial periods or mid-term changes, calculate tax, convert currencies, recognize revenue, manage invoice lifecycle or payment state, or advise on negotiation. All amounts exclude tax. If the standard cannot express something a vendor charges, the engine MUST say so with a warning or an indeterminate result. It MUST NOT approximate.

---

## 2. Conformance

### 2.1 The goal

Given the same `PricingModel` and a valid `DealConfiguration` (plus the engine parameters in section 2.4), any two conformant engines MUST produce the same `InvoiceStatement` values, to the minor unit.

### 2.2 What is compared

Two statements are equal if all of these are equal:

- the set of `line_items`, matched by `line_id`, comparing `category`, `product_id`, `target_id`, `line_total` and `source_fields`
- the set of `adjustments`, in order, comparing `adjustment_type`, `amount`, `applies_to` and `source`
- `subtotals` and `totals`
- `entitlement_summary`, matched by `credit_type_id`
- the `warnings`, compared as a set of (`type`, `severity`) pairs

Not compared: `invoice_id`, `period`, `computation_method`, `computation_notes`, warning `message`, and the informational line fields `description`, `quantity`, `unit`, `unit_price` and `graduated_detail`. Numbers are compared after rounding to the currency's minor unit.

### 2.3 The five tests

A rule in this specification meets all five tests:

1. **Expressible.** Every input the calculation needs can be written in the schemas.
2. **Ordered.** Every step has one defined position.
3. **Bounded.** Every edge case has a defined result or a defined error.
4. **Uninterpreted.** No step requires reading free text to produce a number.
5. **No silent defaults.** See section 3.4.

### 2.4 Engine parameters

An engine takes one parameter besides the two documents:

| Parameter | Values | Default |
|---|---|---|
| `period_type` | `contract_total`, and optionally `monthly`, `quarterly`, `annual` | `contract_total` |

A conformant engine MUST support `contract_total`. It MAY support the others. An engine that does not support the requested value returns the validation failure `unsupported_period_type`. For the others, the statement reports period 1 of that length: recurring charges for those months, and every once-per-contract amount (one-time charges, flat discounts and true-ups) in period 1. `totals.annualized_total` and `totals.total_contract_value` always cover the whole contract. [DN-1]

### 2.5 Exact arithmetic

Engines MUST use exact decimal arithmetic for money, quantities and percentages. Binary floating point can give different cents on different platforms. Intermediate values are not rounded. Rounding happens only where section 9.1 says. [DN-2]

### 2.6 Conformance claims and provisional rules

An engine conforms to a release of this specification if it passes every conformance vector whose status is `settled` for that release (`examples/conformance/`). An engine SHOULD state in `computation_notes` the version of this specification it implements.

A **provisional** rule is one that this release publishes before it has been confirmed against how pricing works in practice. The provisional rules are the drafting notes listed in Annex D that are not marked settled, and the vectors with status `provisional` test them. A provisional rule can be changed or settled in a MINOR release, after the review that a MINOR needs. The prices an engine calculates under a provisional rule can therefore differ between 2.x releases. A rule that is not provisional changes only in a MAJOR release, except that a change which only clarifies it is a MINOR. A MINOR release does not add a provisional rule: that needs a MAJOR.

---

## 3. Conventions

### 3.1 Ids

An id is an opaque, case-sensitive string that matches `^[a-z0-9]+(-[a-z0-9]+)*$`. An id MUST stay the same across versions of a model while its object exists. It MUST NOT be reused for a different object. Ids are unique across the model within each kind (module, tier, product, commitment plan, credit type, credit package and so on). A module and a tier may share an id, and every field that can name more than one kind has a `*_kind` companion that says which.

### 3.2 Percentages and signs

All percentages are percentage points: 20 means 20%.

| Where | Sign |
|---|---|
| `commitment_plans[].adjustment.percent` | Signed. Negative is a discount. |
| `bundles[].adjustment.percent` | Signed. Negative is a discount. |
| Discount values (`manual_value`, strategy output, `max_value`, `caps`) | Positive magnitudes. |
| `InvoiceStatement.adjustments[].amount` | Signed. Negative is a discount. Positive is a charge or a true-up. |

Successive percentage adjustments compound on the running amount, in phase order. Flat amounts are subtracted from the running amount at their scope. A percentage adjustment below -100 is the validation failure `invalid_percent`.

### 3.3 Empty arrays and targets

An empty array in a `targets` or `eligibility` field means unrestricted on that dimension. A charge matches a `targets` object only if:

- `tier_ids` is empty, or the charge comes through a listed tier, **and**
- `module_ids` is empty, or its module id is listed.

A module is charged through the tier of its product selection when it is in that tier's `included_modules`, or is required (section 4.4). A module added by `module_selections` is charged through no tier. A null `eligibility` or `targets` object is unrestricted on every dimension. The same rule applies to `product_ids`, `credit_type_ids`, `regions` and `deal_motions` wherever they appear. [DN-3]

### 3.4 No silent defaults

A value inferred from unstructured input MUST be left null or absent, or MUST produce an error or an indeterminate marker, whenever the inference is not certain. An engine MUST NOT fill in a value it does not have. Where this specification lets an engine continue without a value, it names the warning to emit.

### 3.5 Ordering

Arrays are processed in the order they arrive. `position` is for display only. It is never an identifier or a diff key, and it never changes a calculation.

### 3.6 Results

Every outcome is exactly one of these:

| Outcome | Meaning | What the engine returns |
|---|---|---|
| **Statement** | The calculation completed. | An `InvoiceStatement`, with any warnings. |
| **Validation failure** | An input is invalid or incomplete: a hard-block rule, a missing quantity, an unresolved id. | No `InvoiceStatement`. An error result that names a `code` from Annex A, the path of the offending value, and every failure found. Its shape is outside this standard. An engine MAY include partial results. |
| **Indeterminate** | The standard cannot express something the model contains, or an input is unknown. | A statement with a warning from Annex B, and with the affected amount absent or null as that section says. |

A calculation never ends partway as a statement. It is a statement, or it is a validation failure. [DN-24]

### 3.7 Currency

The model's `currency` is the base currency. A price whose `currency` is null uses it. A calculation MUST resolve to one currency. A price book supplies it when one applies (section 7.3). If prices in the calculation have different currencies after phase 2, or a minimum commitment's currency differs from the statement's, that is the validation failure `mixed_currency`. There is no foreign exchange.

### 3.8 Periods

| Vocabulary | Months | Used by |
|---|---|---|
| `month`, `monthly` | 1 | `price.period`; grant `period`; invoice `period_type` |
| `quarter`, `quarterly` | 3 | `price.period`; invoice `period_type` |
| `year`, `annual` | 12 | `price.period`; grant `period`; invoice `period_type` |
| `one_time` | not periodic | `price.period`; grant `period` |
| `per_billing_period` | months of the price period of the module that carries the grant | grant `period` |
| `concurrent`, `lifetime` | not periodic | grant `period` |
| `contract_total` | the contract term | invoice `period_type` |

`contract_term_months` is the term. A recurring contract charge is the amount × (`contract_term_months` ÷ months per price period). If that quotient is not a whole number, that is the validation failure `term_not_multiple_of_period`. There is no implicit proration.

A **billing period** of a price is one of those `N = contract_term_months ÷ months` periods, counted from 1. [DN-21]

---

## 4. Inputs

### 4.1 Joining the documents

`DealConfiguration.model_reference.model_id` MUST equal `PricingModel.model_id`. Every id in the deal configuration MUST resolve in the model (Annex C). Otherwise the result is the validation failure `unresolved_reference`.

### 4.2 Quantities

A product selection's `quantities[]` holds entries per credit type. Each entry has a `quantity_type`:

| Type | Meaning |
|---|---|
| `committed` | Billed. |
| `estimated` | Billed, and the statement carries an `estimated_quantity` warning. |
| `starting` | Billed. It is the quantity until the growth schedule says otherwise. |
| `maximum` | Never billed. A ceiling: a billed quantity above it is the validation failure `maximum_exceeded`. |

For each (product, credit type) there MUST be at most one billed entry (`committed`, `estimated` or `starting`) and at most one `maximum` entry. A second billed entry is the validation failure `duplicate_billed_quantity`. A quantity below 0 is `negative_quantity`.

**Growth schedule.** A billed entry may have a `growth_schedule`. Each item has a `period_index`, counting **contract years** from 1, and a `quantity`. In contract year *y* the quantity is the schedule's entry for `period_index` *y*, and the entry's own `quantity` where the schedule has none. `period_index` MUST be unique within a schedule (`duplicate_period_index`). `period_label` is display text only. [DN-4]

The quantity of a price in billing period *j* is the quantity in the contract year in which that period starts, which is the year containing month (*j* - 1) × months + 1.

### 4.3 The quantity a price uses

A module price with `credit_type_id` *c* uses the billed quantity of *c* in the same product selection, per section 4.2. A credit-package price uses `credit_package_selections[].quantity`. A `flat` price uses no quantity. An overage price uses the overage quantity (section 7.6).

A `per_unit`, `tiered` or `volume` price with no billed quantity is the validation failure `missing_quantity`. An engine MUST NOT substitute zero: zero is a valid quantity with a defined price.

### 4.4 Selecting modules

A product selection charges these modules, each once:

1. the modules in the chosen tier's `included_modules`
2. every module with `required: true` for the product, whether or not the tier lists it
3. the modules in `module_selections`

A module in `module_selections` that the chosen tier already includes is the validation failure `module_selection_in_tier`. A required module that is also in `module_selections` is charged once and is not a failure.

### 4.5 Selecting a commitment plan

For each product selection the commitment plan is, in order: its `commitment_plan_id`, if non-null; otherwise `billing.plan_id` if it names a commitment plan of that product (`billing.plan_id` is deprecated); otherwise none. `contract_term_months` MUST be at least the plan's `commitment_months`, where a null `commitment_months` means no minimum. A shorter term is the validation failure `term_below_commitment`. Charges always use `contract_term_months`.

### 4.6 Metrics

A metric name is resolved in this order:

1. If it equals a credit type id, its value is the sum over product selections of the billed quantity of that credit type in contract year 1.
2. If it is one of the derived metrics, its value is that:
   - `contract_term_months`: the term.
   - `gross_annual_recurring`: the sum of the `line_total` of recurring lines after phase 4, divided by (`contract_term_months` ÷ 12).
3. Otherwise it is unresolved.

[DN-5] An unresolved metric in a discount strategy follows `pricing_rules.policy.missing_strategy_inputs_handling` (section 7.7). In an eligibility `min_metric` it makes the object ineligible.

### 4.7 Region

`customer.region` is an ISO 3166-1 alpha-2 country code, or null. The country codes are those assigned in ISO 3166-1 on 1 January 2026. A code assigned later is added only in a MINOR release, as groupings are. A code that is neither a country code nor in the grouping list below is the validation failure `unknown_region`. Matching is exact and case-sensitive. A `price_books[].region` is a country code or a grouping code. Groupings: `EU` (AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE) and `EEA` (the EU plus IS, LI, NO). Groupings are added only in a MINOR release. [DN-6]

---

## 5. Price primitives

A price has a `type`, a `period`, an `amount`, optional bands, and a `credit_type_id`. The schema pairs them: `tiered` uses `tiers` only, `volume` uses `breakpoints` only, and `flat` and `per_unit` use neither.

### 5.1 Charge for one billing period

| Type | Charge in a billing period with quantity *q* |
|---|---|
| `flat` | `amount` |
| `per_unit` | `amount` × *q* |
| `tiered` | Graduated. For each band, (the part of *q* inside the band) × the band's `value`. Sum over bands. |
| `volume` | *q* × the `value` of the one band that contains *q*. |

A `one_time` price is charged once, with the quantity of contract year 1. A recurring price is charged in each of its *N* billing periods.

### 5.2 Bands

Bands are half-open: a band includes its `min` and excludes its `max`. The bands of a price MUST be contiguous (each `min` equals the previous `max`), the first `min` MUST be 0, and the last `max` MUST be null (unbounded). A price with bands that break this is the validation failure `malformed_bands`, reported as a model authoring error. Quantity MUST be at least 0. A fractional quantity is used as it is, without rounding. Quantity 0 gives a charge of 0.

For `tiered`, the part of *q* in a band is the amount of the interval [`min`, `max`) that lies below *q*. For `volume`, the band containing *q* is the one with `min` ≤ *q* < `max`.

### 5.3 Unpriced items

A `flat` or `per_unit` price with a null `amount` means the price is not published. The engine emits an `unpriced_item` warning, adds no charge for that line (the line appears with `line_total` 0), and states totals as covering priced items only. They are a lower bound. A `tiered` or `volume` price has a null `amount` as a matter of course: its price is in the bands.

---

## 6. Phases

The calculation has nine phases, numbered from 0. They run in this order.

| # | Phase | What it does |
|---|---|---|
| 0 | Validate | Checks the inputs. |
| 1 | Variant | Applies deal-motion overrides. |
| 2 | Price book | Applies regional prices. |
| 3 | Price resolution | Commitment-plan adjustment, then bundle adjustment, then negotiated price replacements. |
| 4 | Line items | Module and credit-package charges. |
| 5 | Overages | Entitlements and overage. |
| 6 | Discounts | Model discounts, then negotiated discounts and caps, then whole-deal overrides. |
| 7 | Minimums | True-ups to minimum commitments. |
| 8 | Assemble | Rounding, totals and output. |

A phase that finds a validation failure does not stop the others from finding more. An engine reports every failure it can find. The exception is step 1 of section 7.1: if an id does not resolve, the engine reports the failures of that step and stops, because the later checks would read ids that do not exist.

---

## 7. The phases in detail

### 7.1 Phase 0: Validate

An engine checks, and reports each failure with the code in Annex A:

1. **Join and references** (sections 4.1, Annex C).
2. **Term and quantities** (sections 3.8, 4.2, 4.5).
3. **Eligibility.** A deal motion, region or metric restriction applies to an object through its `eligibility`: the deal's `deal_motion` MUST be in `deal_motions` and the customer's region in `regions` (a grouping contains its member countries), and `min_metric` MUST be met (the metric's value is at least `min`), unless the list is empty or the object is null. An object that is explicitly selected and ineligible follows `pricing_rules.policy.ineligible_selection_handling`: `error` is the validation failure `ineligible_selection`, and `drop_with_warning` treats it as not selected and emits an `ineligible_selection` warning. A commitment plan counts as selected whether it comes from `commitment_plan_id` or from `billing.plan_id`, and an ineligible one is handled the same way. The grants of an ineligible plan do not join the entitlement pools. An ineligible mandatory discount or minimum commitment simply does not apply, with no warning. Variants can override a discount's or bundle's enabled state (section 7.2). [DN-7]
4. **Module dependencies.** A dependency is met only if the required object is selected or included in the configuration: a module that is charged, a tier that is chosen, a product that is selected, or a credit package that is selected. It is an exact match with no tier ordering (`dependency_unmet`). A dependency applies only when the dependent object is present (a module that is charged, a tier that is chosen in any selection, a product that is selected, or a credit package that is selected). The required object may be present in any product selection of the deal.
5. **Business rules.** An engine that evaluates rules reports a violated `hard_block` rule as the validation failure `hard_block_rule`, and a triggered `warning` rule as a `rule_warning` warning. An engine that does not evaluate a rule MUST NOT report the configuration as validated against it. It emits one `unevaluated_rule` info warning that lists the ids of the rules it did not evaluate. Rules are text. The engine MUST NOT turn an unevaluated rule into a price.
6. **Relationships.** `pricing_relationships` of type `prerequisite` and `mutual_exclusion` are enforced like dependencies (`dependency_unmet`, `mutual_exclusion`): for a `prerequisite`, the subject present and the `related_to` object missing is `dependency_unmet`, and for a `mutual_exclusion`, both objects present is `mutual_exclusion`. `upgrade_path`, `migration_path` and `other` are informational. `bundle_discount`, `volume_across_products`, `credit_sharing` and `entitlement_pooling` imply a calculation that has no parameters: the engine treats them as informational and emits a `relationship_not_modeled` warning whenever the model holds such a relationship, whether or not its objects are selected. Use `bundles[]` for a bundle discount.
7. **Model integrity.** At most one variant per `deal_motion` (`multiple_variants_for_motion`). `discount_application_order` MUST list every discount that applies to the deal (`discount_not_ordered`). A discount with `mode: manual` and `discretion: mandatory` is invalid (`invalid_discount`) and is not applied, so it gives no `missing_manual_value` as well.

### 7.2 Phase 1: Variant

The variant whose `deal_motion` equals the deal's applies. If none does, there are no overrides.

- `module_price_overrides[]` and `credit_package_price_overrides[]` replace the whole `price` object for that module or package.
- `included_credit_grants` replace grants by (`credit_type_id`, `period`) in the entitlement pools (section 7.6).
- `discount_eligibility_overrides[]` and `bundle_eligibility_overrides[]` set the `enabled` state. `enabled: false` makes the discount or bundle ineligible. `enabled: true` makes it eligible whatever its own `eligibility` says. [DN-8]

### 7.3 Phase 2: Price book

The price book whose `region` equals the customer's region applies. If none does, a book whose region is a grouping that contains it applies. If more than one grouping matches, that is `ambiguous_price_book`. A null region, or a valid region with no price book, means base prices apply.

A price-book entry for a module or package replaces the price. A price in an entry with a null `currency` is in the book's currency. A module that a variant overrode is **not** overridden by the price book: a price set for a specific kind of deal is final. For any other module or package, the price book's `fallback_multiplier` applies when the book has no entry for it: the amount and every band `value` of the price after phase 1 are multiplied by the multiplier, and the result is in the book's currency. A null `fallback_multiplier` means the post-phase-1 price is used only if its currency equals the book's, and otherwise the result is `mixed_currency`.

### 7.4 Phase 3: Price resolution

For each charged module, in order:

1. **Commitment plan.** If the product selection has a commitment plan, it is eligible, and the module matches its `targets` (section 3.3), the price's `amount` and every band `value` are multiplied by (1 + `adjustment.percent` ÷ 100).
2. **Bundle.** For each entry of `bundle_selections`, in order: the bundle applies only if every id in its `product_ids` appears in `product_selections` and it is eligible. It multiplies the module prices of those products by (1 + `adjustment.percent` ÷ 100), after the commitment plan. A selected bundle that does not apply follows `ineligible_selection_handling`. Its `included_credit_grants` join the entitlement pools (section 7.6). [DN-9]
3. **Negotiated price replacements.** From `negotiated_overrides.price_overrides[]`:

| `override_type` | Effect on its target |
|---|---|
| `fixed_price` | The price becomes a `flat` price of `override_value` per price period. |
| `custom_unit_price` | The price becomes a `per_unit` price of `override_value`, with the same period and `credit_type_id`. |
| `waived` | The charge is 0. |

A replacement is not discounted again by the commitment plan or bundle. The adjustments of steps 1 to 3 are reported as `adjustments[]` entries (section 9.3).

The valid combinations of `target_kind` and `override_type`:

| `target_kind` | Replacements (phase 3) | Discounts and caps (phase 6) |
|---|---|---|
| `module`, `credit_package` | `fixed_price`, `custom_unit_price`, `waived` | `discount_percentage`, `discount_amount`, `capped` |
| `credit_type_overage` | `custom_unit_price`, `waived` | none |
| `total_deal` | none | `discount_percentage`, `discount_amount`, `capped`, `fixed_price` |

Any other combination is `invalid_override`, and so is a null `override_value` except for `waived`. `custom_unit_price` on `credit_type_overage` sets the overage price to a `per_unit` price of that amount, with the period of the credit type's `overage_price`. If the credit type has no `overage_price`, that is `invalid_override`. [DN-10]

Three more cases are `invalid_override`: a `module` or `credit_package` target that is in the model but is not charged in this deal; any `credit_type_overage` override on a credit type with no `overage_price`; and a `custom_unit_price` on a module whose price has no `credit_type_id`, because there is no quantity to multiply. An override on a credit type that has an `overage_price` but no overage in this deal is accepted and changes nothing. A `target_id` that is not in the model at all, as the kind that `target_kind` names (a module, a credit package or a credit type), is not an `invalid_override`: it is `unresolved_reference`, found by step 1 of section 7.1.

### 7.5 Phase 4: Line items

For each product selection, for each charged module (section 4.4), the engine computes the charge for the contract: the sum, over the price's billing periods, of the charge for that period (section 5.1). Each credit-package selection is charged the same way, with the quantity of `credit_package_selections[].quantity`. A `flat` package price is charged once in each billing period, whatever the number of packages: use `per_unit` for a price per package. [DN-11]

Each charge is a line item. A recurring price gives category `module_charge` (or `credit_package`), and a `one_time` price gives `one_time_fee`. The `line_total` is the charge at the price after phases 1 and 2. The phase 3 changes appear as adjustments, not in `line_total`.

### 7.6 Phase 5: Overages and entitlements

**Pools.** Grants form pools, keyed by (`credit_type_id`, `period`, `metric_type`). The pools are built in this order:

1. Base grants from every charged module, the chosen tier, the selected commitment plans and the bundles that apply. Quantities in a pool add up. A quantity of -1 (unlimited) makes the whole pool unlimited. A mismatch of `renewal_behavior` inside one pool is the validation failure `renewal_mismatch`.
2. Variant grants replace every pool with the same (`credit_type_id`, `period`).
3. Credit-package units: each selected package adds its `quantity` × the number of packages selected to the pool (`credit_type_id`, `one_time`, `consumable`). The package's `rollover_policy` and `expiration_months` do not change the quote-time comparison. [DN-12]
4. `credit_grant_overrides[]` replace the quantity of the pool (`credit_type_id`, `period`). Its `renewal_behavior` and `metric_type` stay those of the pool it replaces. An override for a pool that does not exist is `invalid_override`.

A grant whose `renewal_behavior`, `period` or `metric_type` is `unknown`, or a package whose `rollover_policy` is `unknown`, forms its own pool and is never added into a known pool.

**Demand.** The demand of a credit type in contract year *y* is the sum over product selections of its billed quantity in that year.

**Overage.** For each pool, in each contract year, overage = max(0, demand − granted), read as a quantity per pool period (and as a level, for `capacity`). Overage is 0 where granted is -1. The credit type's overage in a year is the largest overage over its pools. [DN-13] A pool with an `unknown` field makes the whole credit type indeterminate: the engine emits an `indeterminate_entitlement` warning, reports its `overage` and `overage_cost` as null, and charges no overage for it. A package with `rollover_policy: unknown` still counts toward its pool and gives the same warning.

**Policy.** The policy that governs a credit type is its `overage_policy`, overridden by the `overage_policy` of the tier of a product selection that grants it, unless the tier's value is `unknown`. If the tiers of two selections that grant the same credit type give different policies, that is `conflicting_overage_policy`. [DN-14]

| Policy | Result for overage above 0 |
|---|---|
| `pay_as_you_go` | A charge: the credit type's `overage_price` applied to the overage quantity (section 5.1), in each billing period, using that year's overage. A `usage_overage` line item. A null `overage_price` is `invalid_override`. |
| `hard_cap` | The validation failure `hard_cap_exceeded`. |
| `throttle`, `contact_sales` | No charge, and an `overage_not_priced` warning. |
| `unknown` | No charge, and an `indeterminate_entitlement` warning. |

**Consumption rules.** `credit_types[].consumption_rules` are informational at quote time. An engine MUST NOT evaluate their `conditions`. A rule with non-null `conditions` gives a `consumption_conditions_ignored` info warning, for a credit type that has a pool or a billed quantity (the credit types of section 8).

**Not modeled.** Metered usage and rollover from period to period are outside this standard. Carry-forward for `accumulate` and `lifetime` grants is defined for the quote-time comparison only, and means the pool's quantity applies across the whole contract. [DN-15]

### 7.7 Phase 6: Discounts

**Which discounts apply.** A discount applies if it is eligible (section 7.1, step 3) and either `discretion` is `mandatory`, or `discretion` is `discretionary` and it appears in `discount_selections`.

**Order and stacking.** Discounts apply in `discount_application_order`.

- A non-null `exclusive_group` means at most one discount per group applies, chosen by `pricing_rules.policy.exclusive_group_resolution`: `max_discount` takes the one with the largest reduction at its turn, `first_in_order` the first in the order. The `stackable` value makes no difference. The turn of a group is the position of its first member in the order, and the reductions are compared by computing each member there. A tie goes to the member that comes first in the order. For the `stackable: false` rule below, a group has applied once its chosen member has applied.
- `stackable: false` with a null group means the discount applies only if no earlier discount applied.
- `stackable: true` with a null group combines freely. A null `stacking` object means the same.

**Value.**

- A **manual** discount takes `manual_value` from its selection. A null value is `missing_manual_value`. A value above `manual.max_value` (when it is non-null) is `manual_value_exceeds_max`. A value above `manual.approval_required_over` gives an `approval_required` warning and changes nothing else.
- A **strategy** discount takes its value from the strategy named by `strategy.strategy_id`. The strategy's output is in percentage points for `percentage` and model currency for `flat`. Its `caps` clamp the result afterwards: `max_percent` and `max_amount` limit it, and `approval_required_over_percent` and `approval_required_over_amount` give an `approval_required` warning and never change the price.
- An unresolved metric follows `missing_strategy_inputs_handling`: `error` is `missing_strategy_input`, and `zero_with_warning` applies a value of 0 with a `missing_strategy_input` warning.

| Shape | Value for the input *x* |
|---|---|
| `step_tiers` | The `value` of the bracket with `min` ≤ *x* < `max`. Below the lowest `min`: 0. In a gap between two brackets: 0. At or above the highest `max`: the highest bracket's `value`. |
| `linear_ramp` | 0 below `start_at`. From `start_at`: `start_value` + `slope_per_unit` × (*x* − `start_at`), at most `max_value` when that is non-null. |
| `piecewise_linear` | `points` need at least 2 entries with strictly increasing `x`. Linear between neighbours. Below the first `x`: 0. Above the last `x`: the last `y`. At most `max_value`. |
| `lookup_table` | The `value` of the entry whose `key` equals the canonical decimal string of *x* (no leading zeros, no trailing fractional zeros), compared as case-sensitive strings. No match is an unresolved metric. |

**What each scope discounts.** The base is the running amount of the charges in scope, after phase 3. The `module` and `product` scopes include one-time charges:

| `scope` | Base |
|---|---|
| `module` | The charge of each module in `targets.module_ids` (all modules if empty). |
| `product` | The sum of the module charges of each product in `targets.product_ids` (all products if empty). |
| `credits_only` | The credit-package charges for the credit types in `targets.credit_type_ids` (all if empty). |
| `contract_total` | Every charge: module charges, credit packages and overage. One-time fees are excluded unless `targets.module_ids` lists their module. |

A `percentage` discount multiplies each charge in its base by (1 − value ÷ 100). A `flat` discount subtracts its value **once per contract** from the base, spread over the charges in proportion to their running amounts. A flat discount larger than its base is limited to the base, with a `discount_exceeds_base` warning. Each discount is reported as one adjustment. [DN-22]

**Negotiated discounts and caps.** After the model discounts, the `discount_percentage`, `discount_amount` and `capped` overrides for modules and credit packages apply, in array order, to the running amount of their target. `capped` limits the target's running amount to `override_value`. A `discount_amount` is a flat amount, once per contract. An override is not discounted again.

**Whole-deal overrides.** Last in phase 6, the `total_deal` overrides apply to the running total of all charges, in array order: `discount_percentage`, `discount_amount` and `capped` as above, and `fixed_price` sets the total to `override_value`. Each is spread over the charges as a flat amount is.

### 7.8 Phase 7: Minimums

Minimum commitments apply to the amounts after phase 6, so a negotiated price does not escape them. An eligible minimum is evaluated in the order declared. Each compares the **current** net of its scope, which includes the true-ups of earlier minimums, and adds only the shortfall (`amount` minus that net, when positive).

| `scope` | The net it compares |
|---|---|
| `contract_total` | All charges. |
| `annual` | The annualized basis: the recurring net, including true-ups, divided by (`contract_term_months` ÷ 12). The shortfall is multiplied by (`contract_term_months` ÷ 12) to give the true-up. |
| `credits_only` | Credit-package and overage charges for `targets.credit_type_ids` (all if empty). |
| `product` | The net charges of the products in `targets.product_ids` (all if empty). |

A true-up counts toward its own scope and toward any wider scope that contains it: a product or credit true-up counts toward the contract total and the annual basis, and not the reverse. [DN-16] The floor's `currency` MUST equal the statement's. Each true-up is an adjustment of type `minimum_true_up`.

### 7.9 Phase 8: Assemble

See section 9.

---

## 8. Entitlement summary

For each credit type that has a pool or a billed quantity, `entitlement_summary` has one entry:

- `granted`: the quantity of the pool that gives the reported overage, -1 for unlimited, and null if the credit type has no pool or is indeterminate.
- `committed_or_used`: the largest demand over the contract years.
- `overage` and `overage_cost`: the largest yearly overage, and the total overage charge over the contract. Null if indeterminate. When a credit type is determinate and no overage charge arises, `overage_cost` is 0: this includes `throttle`, `contact_sales` and `hard_cap`.
- `overage_policy`: the governing policy.

[DN-17]

---

## 9. Output

### 9.1 Rounding

`pricing_rules.rounding` null means `{mode: none}`: nothing is rounded. With `mode: currency_minor_units`, `currency_minor_units` is the number of decimal places, and a tie rounds away from zero (`method: half_away_from_zero`). Only line totals and adjustment amounts are rounded, each once. Unit prices, band values and percentages are never rounded. Totals are sums of the rounded components. `annualized_total` is computed from those totals, then rounded.

### 9.2 Line items

| Field | Rule |
|---|---|
| `line_id` | 1 to *n*, in phase order (phase 4, then phase 5), then input order: product selections in the order of the deal configuration, and within one, modules in the order of `products[].modules[]`, then credit-package selections in deal order. `position` does not matter. |
| `category` | `module_charge`, `credit_package`, `one_time_fee`, or `usage_overage`. |
| `product_id` | The product of the module, for a module line. `null` for a credit-package line and for an overage line: credit packages and credit types belong to the model, not to a product. |
| `target_id` | The id of the charged object: the module id for a module line, the credit package id for a credit-package line, and the credit type id for an overage line. |
| `source_fields` | The price object used (`model#` pointer to the price in the model, or to the variant or price-book price that replaced it; for a price made by a price book's `fallback_multiplier`, the pointer to the price that was multiplied), then the quantity entry (`config#` pointer). A `flat` module price has no quantity entry. A credit-package line lists its `credit_package_selections` entry, whatever its price type. An overage line lists the credit type's `overage_price`, then the entry of `quantities` that gives the overage. |
| `quantity`, `unit`, `unit_price`, `graduated_detail` | Informational. `quantity` is the first-period quantity. `graduated_detail` shows the first billing period. |

A `source_fields` entry is `model#` or `config#` followed by an RFC 6901 JSON Pointer into that document as received. [DN-20] Because a pointer holds array positions, it is valid only against the exact documents it was made from. Minimum true-ups appear as adjustments. The line category `minimum_commitment_true_up` is not used.

### 9.3 Adjustments

Each adjustment has an `adjustment_type`, a signed `amount`, an `applies_to` and a `source`.

| Cause | `adjustment_type` | `applies_to` | `source` |
|---|---|---|---|
| Commitment plan | `commitment_plan_adjustment` | `line:<line_id>`, one per line | pointer to the commitment plan |
| Bundle | `bundle_discount` | `line:<line_id>`, one per line | pointer to the bundle |
| `fixed_price`, `custom_unit_price` | `negotiated_fixed_price` | `line:<line_id>` or `credit_type:<id>` | pointer to the override |
| `waived` | `waived_fee` | as above | pointer to the override |
| Model discount, strategy mode | `strategy_discount` | the scope: `line:<line_id>`, `product:<id>`, `credit_type:<id>` or `contract_total` | pointer to the discount |
| Model discount, manual mode | `other` | as above | pointer to the discount |
| `discount_percentage` | `negotiated_discount_percentage` | scope as above | pointer to the override |
| `discount_amount` | `negotiated_discount_amount` | scope as above | pointer to the override |
| `capped` | `price_cap` | scope as above | pointer to the override |
| Minimum true-up | `minimum_true_up` | `contract_total`, `product:<id>` or `credit_type:<id>` | pointer to the minimum |

For a discount or override, `applies_to` names the one line (`module` scope), the one product (`product` scope) or the one credit type (`credits_only` scope) that it matches, and is `contract_total` when it matches more than one or when its scope is `contract_total`. A minimum true-up follows the same rule with its `product` and `credits_only` scopes, and is `contract_total` for the `contract_total` and `annual` scopes. Adjustments are listed in the order they were applied. The phase 3 adjustments are applied line by line (section 7.4), so they are listed line by line: for each line the commitment plan, then each bundle in `bundle_selections` order, then the replacement. Phase 6 adjustments follow, then phase 7. An adjustment whose amount is 0 is not reported. The type `volume_discount` is not produced by anything in this specification. [DN-18]

### 9.4 Totals

- `subtotals.recurring`: the sum of the `line_total` of recurring lines (module charges, credit packages that recur, and overage). `subtotals.one_time`: the sum of the one-time lines. `subtotals.gross`: both.
- `totals.total_adjustments`: the sum of the adjustments.
- `totals.net_total`: `gross` plus `total_adjustments`, for the period the statement covers.
- `totals.annualized_total`: the recurring net divided by (`contract_term_months` ÷ 12). One-time charges, and the adjustments that apply to them, are excluded. They are reported separately, not spread over the term. An adjustment spread over both recurring and one-time lines contributes its recurring share, rounded once on its own. `annualized_total` is the sum of the rounded recurring line totals and these rounded shares, divided by (`contract_term_months` ÷ 12) and rounded.
- `totals.total_contract_value`: the net of the whole contract: the per-period recurring charges (following the growth schedule) plus the one-time charges, after adjustments.

Both `annualized_total` and `total_contract_value` are non-null whenever a statement is produced. If an `unpriced_item` warning is present, they cover priced items only and are a lower bound. [DN-19]

### 9.5 Warnings

`warnings[]` holds the warnings of Annex B. A validation failure is not a warning: it ends the calculation as a validation failure (section 3.6).

---

## Annex A. Validation failure codes

| Code | When |
|---|---|
| `unresolved_reference` | An id does not resolve, or the model id does not match. |
| `unknown_region` | `customer.region` is not a country or grouping code. |
| `ambiguous_price_book` | More than one grouping price book matches. |
| `term_not_multiple_of_period` | `contract_term_months` is not a whole number of a price's periods. |
| `term_below_commitment` | The term is shorter than the commitment plan's `commitment_months`. |
| `missing_quantity` | A price needs a quantity and has none. |
| `negative_quantity` | A quantity is below 0. |
| `duplicate_billed_quantity` | Two billed entries for one product and credit type. |
| `duplicate_period_index` | A growth schedule repeats a `period_index`. |
| `maximum_exceeded` | A billed quantity is above the `maximum` entry. |
| `module_selection_in_tier` | A module in `module_selections` is already in the tier. |
| `ineligible_selection` | A selected object is ineligible and the policy is `error`. |
| `dependency_unmet` | A module dependency or `prerequisite` relationship is not met. |
| `mutual_exclusion` | A `mutual_exclusion` relationship is violated. |
| `hard_block_rule` | A `hard_block` business rule is violated. |
| `malformed_bands` | A price's bands are not contiguous from 0 to unbounded. |
| `invalid_percent` | A percentage adjustment is below -100. |
| `mixed_currency` | The calculation has more than one currency. |
| `invalid_override` | A negotiated override has an invalid target, type or value, or targets nothing. |
| `multiple_variants_for_motion` | Two variants for one `deal_motion`. |
| `discount_not_ordered` | An applicable discount is missing from `discount_application_order`. |
| `invalid_discount` | A discount is mandatory and manual. |
| `missing_manual_value` | A selected manual discount has no value. |
| `manual_value_exceeds_max` | A manual value is above `max_value`. |
| `missing_strategy_input` | A strategy input is unresolved and the policy is `error`. |
| `renewal_mismatch` | Grants in one pool disagree on `renewal_behavior`. |
| `conflicting_overage_policy` | Tiers of two selections give different overage policies for a credit type. |
| `hard_cap_exceeded` | Overage above 0 where the policy is `hard_cap`. |
| `unsupported_period_type` | The engine does not support the requested `period_type`. |

## Annex B. Warning types

| Type | Severity | When |
|---|---|---|
| `estimated_quantity` | warning | A billed quantity has type `estimated`. |
| `unpriced_item` | warning | A `flat` or `per_unit` price has a null amount. |
| `indeterminate_entitlement` | warning | A pool has an `unknown` field, or the policy is `unknown` with overage. |
| `overage_not_priced` | warning | Overage above 0 under `throttle` or `contact_sales`. |
| `approval_required` | warning | A discount value is above its approval threshold. |
| `ineligible_selection` | warning | A selected object is ineligible and the policy is `drop_with_warning`. |
| `missing_strategy_input` | warning | A strategy input is unresolved and the policy is `zero_with_warning`. |
| `discount_exceeds_base` | warning | A flat discount was limited to its base. |
| `rule_warning` | warning | A `warning` business rule is triggered. |
| `relationship_not_modeled` | warning | A relationship type implies a calculation that has no parameters. |
| `unevaluated_rule` | info | The engine did not evaluate some business rules. Lists their ids. |
| `consumption_conditions_ignored` | info | A consumption rule has `conditions`. |

## Annex C. References that must resolve

The reference rules are in `schemas/pricing_model.json`, in `$defs/referential_rules`. A conformant engine or validator runs them after schema validation. In words:

- **Uniqueness.** Ids are unique across the model within each kind.
- **Resolution.** Every id in `tiers[].included_modules`, `commitment_plans[].targets`, `default_for_tier_ids`, `bundles[].product_ids`, `discounts[].targets`, `discounts[].strategy.strategy_id`, `credit_packages[].credit_type_id`, price-book and variant override ids, `minimum_commitments[].targets`, `business_rules[].applies_to`, `module_dependencies`, `pricing_relationships`, `comparison_grid`, every grant's `credit_type_id` and every non-null `price.credit_type_id` resolves to an object of the right kind. The `*_kind` fields give the kind where it can vary. The `DealConfiguration` join keys (`product_id`, `tier_id`, `commitment_plan_id`, `credit_type_id`, `credit_package_id`, `module_id`, `bundle_id`, `discount_id`) resolve to the matching object. So do the `target_id` of each price override (a module, a credit package or a credit type, as its `target_kind` says; `total_deal` has none) and the `credit_type_id` of each credit grant override. The `DealConfiguration` and `InvoiceStatement` refer to the model by `model_id`.
- **Disjointness.** No tier is in `default_for_tier_ids` of more than one commitment plan of a product.
- **Ordering.** Among siblings, `position` is either null for all, or distinct integers 0 to n-1.
- **Kinds.** Each `*_kind` matches the object its id names.
- **Context rules.** A module price with type `per_unit`, `tiered` or `volume` has a non-null `credit_type_id`. A `flat` price, a credit-package price and an `overage_price` have a null one.

## Annex D. Drafting notes

These are the places where this specification states a rule the register of decisions did not settle, or chooses between readings. Each is open to change before 2.0.0. From the 2.0.0 release, each one that is not marked settled is a provisional rule (section 2.6). The last column says whether the point was raised before the specification was written.

| # | Where | What was drafted | Raised before? |
|---|---|---|---|
| DN-1 | 2.4 | `period_type` other than `contract_total` reports period 1, with once-per-contract amounts in period 1. Only `contract_total` is required. | The period-1 rule was a loose end (approved). The rest is new. |
| DN-2 | 2.5 | Engines MUST use exact decimal arithmetic. Implied by "to the minor unit". | No |
| DN-3 | 3.3 | A module is charged through its tier when the tier lists it or it is required. Add-ons are charged through no tier. | No |
| DN-4 | 4.2 | `period_index` counts contract years, not billing periods. A price's billing period uses the contract year in which it starts. | No |
| DN-5 | 4.6 | The derived metrics are `contract_term_months` and `gross_annual_recurring`. A credit-type metric is the contract-year-1 quantity summed over selections. | Yes: the register said the list was "still to be defined". |
| DN-6 | 4.7 | The region code set and the `EU` and `EEA` groupings. Country beats grouping. **Country codes settled 2026-10-22:** the ISO 3166-1 codes assigned on 1 January 2026. The groupings are still drafted (practitioner question Q13). | Partly: the register said "documented groupings" without a list. |
| DN-7 | 7.1 | Eligibility: where each restriction applies, and how selected-but-ineligible objects are handled. **Settled 2026-10-22:** a plan from `billing.plan_id` counts as selected, and an ineligible plan's grants do not join the pools. | No |
| DN-8 | 7.2 | A variant's `enabled: true` overrides the object's own eligibility. | No |
| DN-9 | 7.4 | A bundle that is selected but not fully matched follows `ineligible_selection_handling`. Several bundles compound in `bundle_selections` order. | No |
| DN-10 | 7.4 | `fixed_price`, `custom_unit_price`, `waived` and `capped` semantics, the valid target and type table, and overage-price overrides. | Partly: the overage-price override was flagged when the schemas were drafted. |
| DN-11 | 7.5 | A `flat` credit-package price is not multiplied by the number of packages. | No |
| DN-12 | 7.6 | Package units form the pool (`credit_type_id`, `one_time`, `consumable`). Rollover and expiration are informational at quote time. | Partly: the decision said packages join the pool. |
| DN-13 | 7.6 | Overage is evaluated per pool per contract year, and the credit type's overage is the largest over its pools. Quantities are read in the pool's own period. | No |
| DN-14 | 7.6 | A tier's policy applies to the credit types its selection grants. Tier policies that disagree for one credit type are a validation failure. | No |
| DN-15 | 7.6 | `accumulate` and `lifetime` carry-forward means the pool applies across the whole contract. | Partly: the decision said carry-forward is quote-time only. |
| DN-16 | 7.8 | True-ups count toward the annual basis and the contract total as recurring amounts. | The scope rule was a loose end (approved). The annual-basis part is new. |
| DN-17 | 8 | What `granted`, `committed_or_used`, `overage` and `overage_cost` mean when a credit type has several pools. | No |
| DN-18 | 9.3 | The mapping from causes to `adjustment_type`, and the `applies_to` and `source` formats. Manual model discounts use `other`. **Settled 2026-10-22:** the `applies_to` rule, line-by-line order of adjustments, and no zero-amount adjustments. The mapping to `adjustment_type` is still drafted. | No |
| DN-19 | 9.4 | Total contract value is the net of the whole contract, after adjustments. | No: only the treatment of one-time fees was raised. |
| DN-20 | 9.2 | `source_fields` entries are `model#` or `config#` plus an RFC 6901 pointer, and which pointers a line lists. `product_id` is `null` on credit-package and overage lines. Which `quantities` entry an overage line lists when the overage comes from more than one entry is not yet decided. **Settled 2026-10-22:** `target_id` per line category, and the pointer for a price made by `fallback_multiplier`. | Yes, for the prefix, when the schemas were drafted. The list of pointers and the `null` product are new. Raised by the second-engine run (`examples/conformance/second-engine/NOTES.md`, entries 36 and 37). |
| DN-21 | 3.8 | The three period vocabularies are reconciled by a table of equivalents. The decision said "aliases plus deprecation", and the schemas have neither. | Yes: reported as not done when the schemas were drafted. |
| DN-22 | 7.7 | A flat discount, and each whole-deal override, is spread over its base in proportion to running amounts. A flat discount above its base is limited, with a `discount_exceeds_base` warning. | No |
| DN-23 | Annexes A, B | The names of every validation code and warning type. The decisions fixed the behavior for most, and named a few warnings (`estimated_quantity`, `unpriced_item`, `approval_required`, `indeterminate_entitlement`, `unevaluated_rule`). Codes and warnings such as `ambiguous_price_book`, `conflicting_overage_policy`, `mutual_exclusion`, `rule_warning`, `overage_not_priced` and `ineligible_selection` are new. | No |
| DN-24 | 3.6 | A validation failure returns no `InvoiceStatement`. The 1.x LLM reference let an engine return partial results alongside an error. Here partial results are optional and outside the standard. | No |

## Annex E. Reverse-solve levers (informative)

The README and CHANGELOG of 1.0.0 described a reverse-solve procedure. This standard does not specify one. Finding a configuration that reaches a target price is an optimization with more than one answer, so it is outside the deterministic calculation. The things an application can vary are: contract term, quantities, tier, commitment plan, module selections, bundles, discounts and negotiated overrides. Two applications that search these will not always agree, and that is not a conformance failure.

---

*Pricing Calculation Specification v2.0.0 (draft) — The Value Project, pricing-models standard, PMS schemas v2.0.0*
*Published by [ValueIQ](https://valueiq.ai)*

---
*License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · Copyright 2026 The Value Project (an initiative by [ValueIQ](https://valueiq.ai)) · Part of [The Value Project](https://github.com/The-Value-Project/pricing-models)*
