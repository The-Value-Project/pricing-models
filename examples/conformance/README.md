# Conformance vectors

These vectors test an implementation of the [Pricing Calculation Specification](../../spec/pricing-calculation-spec.md) for schemas 2.0.0. Each directory in `vectors/` is one test.

| File | What it holds |
|---|---|
| `model.json` | A `PricingModel`. |
| `config.json` | A `DealConfiguration`. |
| `expected.json` | The expected result, with the spec sections it tests and a short worked explanation of the numbers. |

`index.json` lists every vector with its status.

## What `expected.json` says

- `expected.outcome` is `statement` or `validation_failure`.
- For a statement, `expected.statement` is the `InvoiceStatement`. Two statements are equal as section 2.2 of the specification defines: line items (matched by `line_id`: `category`, `product_id`, `target_id`, `line_total`, `source_fields`), adjustments in order (`adjustment_type`, `amount`, `applies_to`, `source`), `subtotals`, `totals`, `entitlement_summary`, and the set of warnings by `type` and `severity`. `computation_method`, `computation_notes`, warning `message`, `invoice_id`, `period` and the informational line fields (`description`, `quantity`, `unit`, `unit_price`, `graduated_detail`) are not compared.
- For a validation failure, `expected.codes` is the set of failure codes from Annex A. An engine passes if it reports exactly that set.

## Status

| Status | Meaning |
|---|---|
| `settled` | The rule follows a decision that has been made. A conformant engine must match. |
| `provisional` | The rule depends on a point the specification still marks as a drafting note, or that is out of review with pricing practitioners. `open_question` names it. The expected result may change before 2.0.0. |

## How the expected values were made

Every expected figure was worked out by hand first (the `worked` text shows the arithmetic) and then checked against a reference engine written from the specification. A vector is not added until the hand-worked figures and the engine agree. The same person wrote the hand calculations and the engine, so this shows they are consistent with each other. It does not show that a second, independent reading of the specification would agree. That check is still to be done, and a vector may change when it is.

The worked example in `examples/acme_ai_platform_pms.json`, `acme_deal_config.json` and `acme_invoice.json` is the same kind of test: one realistic quote.

## Running your engine

Run your engine on each `model.json` and `config.json`, and compare its result with `expected.json` as above. A vector that your engine fails points to either a bug in the engine or a gap in the specification. Please report gaps as issues.
