# LawDesk V1 Test Report

## Test Context

- Git branch: `release/v1.0-rc-preparation`
- Git commit: `cbd8a3e Improve V1 legal reasoning generation`
- Test date: 2026-07-16
- Environment: local RC validation environment
- Database: PostgreSQL `lawdesk_rc_test`
- Package manager: pnpm 9.12.0

## Automated Results

| Check | Result | Evidence |
| --- | --- | --- |
| Backend typecheck | PASS | `pnpm --filter @lawdesk/backend typecheck` |
| Backend build | PASS | `pnpm --filter @lawdesk/backend build` |
| Frontend typecheck | PASS | `pnpm --filter @lawdesk/frontend typecheck` |
| Frontend build | PASS | `pnpm --filter @lawdesk/frontend build` |
| Backend Draft Workflow Regression | PASS | 35/35 tests passed. |
| Document Workflow Regression | PASS | 7/7 tests passed. |
| Frontend Regression | PASS | 23/23 tests passed. |
| Golden Runner | PASS | 13/13 Validator and Scoring tests passed. |
| `git diff --check` | PASS | No whitespace errors in the validated change set. |
| Golden Case01 Mock Run | PASS | Score 88/100. Provider: mock. Model: mock-lawdesk-v1. Hard Failures: None. |

## Coverage Summary

- Draft publication allow-lists: accepted for Fact, Issue, Law, and Argument; ready_to_publish for Document.
- Cross-Matter protection, transaction rollback, idempotency, source validation, and published pointer integrity.
- Frontend strict handling of non-2xx, invalid JSON, invalid response structure, and valid empty data.
- Intake upload persistence, file validation, duplicate detection, and Session Storage boundaries.
- Golden P0 hard failures, deterministic scoring, complete Pass Fixture, and independent Fail Fixtures.

## Known Test Limitations

- Golden Case01 Mock execution completed successfully against local RC validation environment.
- Provider audit metadata is accepted only when returned by actual Workflow API responses; missing metadata causes Golden failure.
- MiniMax real-provider execution was not part of this RC test record.
- Deployment smoke tests and production infrastructure verification are not included in this report.

## Result

- Automated RC regression gate: PASS
- Golden Case01 Mock execution: PASS (88/100)
- Final deployment gate: NOT EXECUTED
- Recommendation: proceed to RC candidate deployment verification.
