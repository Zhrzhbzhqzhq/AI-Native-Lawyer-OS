# LawDesk V1 RC Checklist

## Release Scope

- Version: V1.0 RC
- Branch: `release/v1.0-rc-preparation`
- Baseline commit: `181c120 Add V1 golden case validation`
- Review date: 2026-07-16

## Release Gate

| Gate | Result | Evidence |
| --- | --- | --- |
| Code Freeze | PASS | V1 product code is frozen; release work is limited to documentation. |
| Database Freeze | PASS | PostgreSQL schema and Draft Workflow migrations are frozen and validated on `lawdesk_rc_test`. |
| Workflow Freeze | PASS | V1 Workflow identifiers and lawyer-confirmation rules remain unchanged. |
| Domain Model Freeze | PASS | Frozen Domain Model names remain unchanged; Draft records are Workflow persistence models. |
| Backend Runtime | PASS | Backend typecheck and build passed; production Mock fallback is prohibited. |
| Frontend Workspace | PASS | Frontend typecheck, build, and Workspace response-boundary review passed. |
| Draft Workflow | PASS | Schema, Services, APIs, Frontend Draft Workspace, transaction safety, and publish integrity are complete. |
| Regression | PASS | Backend Draft Workflow 35/35, Document Workflow 7/7, and Frontend 23/23 passed. |
| Golden Framework | PASS | Golden Runner unit tests passed 13/13; Dataset provenance is `confirmed_synthetic`. |
| Golden Mock Run | N/A | Full Case01 Mock run has not been executed against the RC Backend. |
| Deployment | FAIL | RC deployment and post-deployment smoke verification have not been performed. |
| Known Issues | PASS | Known issues and operational limitations are documented in `V1_Known_Issues.md`. |
| Release Decision | FAIL | Not approved for final release until deployment verification is complete; remain an RC candidate. |

## Release Decision

- RC candidate preparation: PASS
- Final production release: FAIL
- Blocking gate: deployment and post-deployment verification have not been executed.
- Golden Mock Run: not a fabricated PASS; recorded as N/A until executed.
