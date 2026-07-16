# Case01 Known Risks

## Dataset Risks

- The materials are intentionally narrow and suitable for a basic private lending workflow test.
- The expected legal basis is marked `pending_legal_database_verification`.
- Amount, date, jurisdiction, party identity numbers, addresses, interest start date, and interest amount must remain lawyer-confirmed placeholders in the complaint unless the workflow extracts them with sufficient evidence and review.

## Model Evaluation Risks

- A model may over-generate issues unrelated to the materials, such as spouse debt, guarantee liability, affiliated company liability, actual controller liability, or fund commingling.
- A model may split one legal issue into many duplicate issues. Case01 V1 expects three core issues.
- A model may output internal technical fields, source IDs, confidence values, or AI reasoning inside the complaint body. This is a hard failure.
- A model may treat file names as evidence titles. Evidence must be proof-object oriented, not file oriented.

## Workflow Risks

- Draft workflow stages must not bypass lawyer review.
- Runtime reset and run reports must not delete the Golden Dataset itself.
- Actual outputs belong in `runs/<timestamp>/actual/`, never in `expected/`.
