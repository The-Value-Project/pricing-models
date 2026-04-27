# PricingModel LLM Interpreter Reference

**The Value Project — pricing-models standard, PMS v1.4**

You are reading this document because you have encountered a `PricingModel` JSON instance on a pricing page conforming to The Value Project pricing-models standard. This reference tells you exactly how to interpret that JSON and how to answer pricing questions from it.

Read this document fully before processing the JSON.

---

## What a PricingModel Is

A `PricingModel` is a complete, computable representation of a vendor's pricing. It is not a summary or a marketing document — it is the authoritative, machine-readable source of truth for what a vendor charges and under what conditions.

Every price in the model is expressed using one of four primitives. Every discount, entitlement, and business rule is an explicit, named object. Every cross-reference uses a stable string ID. There are no implicit rules and no free-form expressions.

---

## Schema Structure

The JSON object has the following top-level arrays and objects. All are required.

| Field | Type | What it contains |
|-------|------|-----------------|
| `products` | array | The vendor's product catalog — modules, tiers, and plans |
| `bundles` | array | Multi-product bundles with discount adjustments |
| `discounts` | array | Available discounts (manual and strategy-driven) |
| `credit_types` | array | Entitlement pool definitions |
| `credit_packages` | array | Purchasable credit blocks |
| `discount_strategies` | array | Parameterized discount computation functions |
| `price_books` | array | Regional price overrides |
| `variants` | array | Deal-motion-specific overrides |
| `minimum_commitments` | array | Minimum spend floors |
| `pricing_rules` | object | Calculation order, discount order, rounding, policy |
| `business_rules` | array | Plain-text constraints with enforcement levels |
| `module_dependencies` | array | Module dependency graph |
| `pricing_relationships` | array | Cross-product pricing rules |

---

## Products: Modules, Tiers, and Plans

Understanding the three-level product structure is essential.

**Modules** are the atomic unit of pricing. Every priced capability is a module. Each module has a `price` object, an `included_credit_grants` array, and a `features` list. The `required` boolean indicates whether it is mandatory for its product.

**Tiers** are plan levels — named bundles of module IDs. A tier does not have its own price; its price is the sum of the prices of its `included_modules`. Tiers also carry `included_credit_grants` and an `overage_policy`.

**Plans** are commitment-period options. A plan applies a percentage `adjustment` to module prices for the tiers and modules listed in its `targets`. A negative `adjustment.percent` is a discount (e.g. `-20` = 20% off). Plans also carry additional `included_credit_grants`.

To compute the price of a configuration: identify the selected tier's `included_modules`, sum their module prices, then apply the selected plan's `adjustment.percent` to the targeted modules.

---

## Price Primitives

Every `price` object uses exactly one of four `type` values:

| Type | Meaning | How to compute |
|------|---------|----------------|
| `flat` | Fixed recurring charge | `amount` per `period` regardless of quantity |
| `per_unit` | Quantity-based charge | `amount × quantity` per `period` |
| `tiered` | Graduated bands | Each unit charged at the rate of the band it falls in; sum across bands |
| `volume` | Volume threshold | All units charged at the rate of the band the total quantity falls in |

For `tiered` and `volume` types, use the `tiers` array. Each band has `min`, `max` (null = unbounded), and `value` (price per unit in that band). For `volume` pricing, apply the single matching band's rate to the entire quantity.

The `period` field is the billing period: `month`, `quarter`, `year`, or `one_time`.

---

## Credit Types and Entitlements

Credit types model any unit of consumption: seats, API calls, tokens, minutes, queries, etc.

Each `credit_type` has:
- `consumption_rules` — what actions consume credits and at what rate
- `overage_policy` — what happens when the pool is exhausted: `pay_as_you_go`, `hard_cap`, `throttle`, `contact_sales`

Credits are granted via `included_credit_grants` arrays on modules, tiers, plans, and bundles. Each grant specifies:
- `credit_type_id` — which pool
- `quantity` — how many granted (`-1` = unlimited)
- `renewal_behavior` — `reset` (pool refills each period) or `accumulate` (unused carries forward)
- `period` — grant period: `monthly`, `annual`, `per_billing_period`, `concurrent`, `lifetime`, `one_time`
- `metric_type` — `consumable` (depletes and resets), `capacity` (concurrent limit), `cumulative` (grows over time), `one_time` (granted once)

When multiple grants apply (from tier + plan + module), sum the quantities for the same `credit_type_id` unless they have different `period` values.

---

## Discounts

Each `discount` has a `mode`:
- `manual` — a salesperson sets the value up to `manual.max_value`; `approval_required_over` sets the approval threshold
- `strategy` — value is computed by a `discount_strategy` function referenced by `strategy.strategy_id`

Discounts have a `scope` (`module`, `product`, `contract_total`, `credits_only`), a `type` (`percentage` or `flat`), and `targets` specifying which module IDs, product IDs, or credit type IDs they apply to.

Stacking: `stacking.stackable: false` means this discount cannot be combined with others in the same `exclusive_group`. When multiple discounts in the same exclusive group are eligible, apply `pricing_rules.policy.exclusive_group_resolution` (`max_discount` or `first_in_order`).

Apply discounts in the order specified by `pricing_rules.discount_application_order`.

---

## Discount Strategies

A `discount_strategy` is a named function that computes a discount value from an input metric. The `shape.type` determines the function:

| Shape | Behavior |
|-------|---------|
| `step_tiers` | Look up which bracket the input metric falls in; return that bracket's `value` |
| `linear_ramp` | Linear interpolation starting at `start_at` with `slope_per_unit`; cap at `max_value` |
| `piecewise_linear` | Interpolate between declared `points`; cap at `max_value` |
| `lookup_table` | Key-value lookup on the input metric string |

Strategy output values are always positive magnitudes. The engine applies the sign (discount = subtraction from price).

---

## Variants

Variants apply deal-motion-specific overrides before any other calculation. The `deal_motion` field matches one of: `new_logo`, `renewal`, `expansion`, `reprice`.

When a variant applies, its `overrides` replace or augment: module prices, credit package prices, credit grants, discount eligibility, and bundle eligibility. Apply variant overrides in phase 1 before any other calculation.

---

## Price Books

Price books apply regional price overrides. Match on `region` from the deal configuration. A `fallback_multiplier` may be used when a specific module or package override is absent. Apply price book overrides in phase 2, after variant overrides.

---

## Business Rules

Each business rule has:
- `rule_type` — category for routing
- `description` — a plain-text, self-contained statement of the rule
- `enforcement` — `hard_block` (prevent the configuration), `warning` (allow with flag), `info` (informational)
- `applies_to` — which product IDs, tier IDs, and module IDs this rule concerns (empty = applies to all)

**Hard-block rules must be evaluated before computing price.** If any hard-block rule is violated by the deal configuration, the configuration is invalid and no price should be computed.

Read every `description` field. The description alone is sufficient to understand and apply the rule — do not rely solely on `rule_type`.

---

## Module Dependencies

Each entry in `module_dependencies` states that `dependent_id` requires `requires_id` to be selected. Validate all dependencies before computing price. A configuration that selects a dependent module without its required module violates a structural constraint even if no explicit business rule flags it.

---

## Minimum Commitments

Each minimum commitment defines a spend floor. After computing the net total, compare against each applicable minimum commitment. If the net total falls below the floor, a true-up line item brings it to the minimum. Scope values: `contract_total`, `annual`, `credits_only`, `product`.

---

## Calculation Order

Apply phases in this sequence:

1. **Validate** — check join keys, hard-block business rules, module dependencies
2. **Variant** — apply deal-motion overrides
3. **Price Book** — apply regional overrides
4. **Plan** — apply commitment-period adjustments
5. **Line Items** — sum module + credit package charges
6. **Overages** — compare usage to entitlements, compute overage costs
7. **Discounts** — apply in `discount_application_order`
8. **Minimums** — true up to minimum commitment floors
9. **Assemble** — compute subtotals, net total, annualized total, TCV

---

## Answering Common Questions

**"What does [Tier X] cost per month?"**
Find the tier in `products[].tiers` by label or ID. Identify its `included_modules`. Sum the `price.amount` of each module (using the appropriate price primitive). Apply any active plan adjustment. Check applicable price books.

**"What's included in [Tier X]?"**
List the `included_modules` IDs, resolve them to module labels and `features` arrays, and list the `included_credit_grants`.

**"Does [Tier X] include [Feature Y]?"**
Search `features` arrays on modules included in the tier. If not found, check whether a relevant add-on module exists in the product catalog.

**"What happens if a customer exceeds their [credit type] allowance?"**
Find the `credit_type` by ID. Read its `overage_policy`. If `pay_as_you_go`, find the overage rate in the credit type or a relevant credit package. If `hard_cap`, usage is blocked. If `throttle`, service is degraded. If `contact_sales`, escalation is required.

**"What discount can a salesperson offer?"**
Find discounts with `mode: manual`. Read `manual.max_value` for the ceiling and `manual.approval_required_over` for the approval threshold. Check `eligibility` for deal motion and region constraints.

**"What's the best price for a [deal motion] customer?"**
Find the applicable variant overrides. Identify all eligible strategy-driven discounts. Apply them in `discount_application_order`. Compare against minimum commitments. The result is the floor price.

**"Is [configuration X] valid?"**
Evaluate all hard-block business rules against the configuration. Check all module dependencies. If any hard-block fires or a dependency is unmet, the configuration is invalid — state why. Otherwise state that it is valid and list any warning-level rules that apply.

---

## What This Model Does Not Contain

- **Custom negotiated terms** — those live in a `DealConfiguration`, not in this model
- **Historical pricing** — this model reflects current pricing as of `effective_date`
- **Invoice computations** — use an `InvoiceStatement` for computed outputs
- **Customer-specific value estimates** — use a `CustomerVariables` instance paired with a `ValueModel`

---

*PricingModel LLM Interpreter Reference — The Value Project, pricing-models standard PMS v1.4*
*Published by [ValueIQ](https://valueiq.ai)*
