# LawDesk V1 Known Issues

## Release Context

- Version: V1.0 RC
- Baseline commit: `181c120`
- Last updated: 2026-07-16

## Blocking Issues

| ID | Area | Description | Impact | Status |
| --- | --- | --- | --- | --- |
| KI-001 | Deployment | RC deployment and post-deployment smoke checks have not been executed. | Final production release cannot be approved. | Open |

## Non-Blocking RC Issues

| ID | Area | Description | Impact / Workaround |
| --- | --- | --- | --- |
| KI-101 | Golden | Full Case01 Mock run has not been executed. | Golden Framework is unit-tested, but no end-to-end score is claimed. Run it against `lawdesk_rc_test` before using it as release evidence. |
| KI-102 | AI Audit | Golden requires provider, model, fallback, and prompt-version metadata from actual Workflow API responses. | Missing metadata intentionally causes `provider_audit_metadata_missing` or `prompt_version_missing`. |
| KI-103 | Dev Routes | `devRoutes.ts` remains in the working environment but is not part of the RC product commit. | Golden does not call `/dev/reset` or purge. Do not enable Dev Reset or Dev Purge in deployed environments. |
| KI-104 | Server Integration | An uncommitted `server.ts` integration may reference Dev Routes in the working tree. | A clean RC checkout must be verified to start without relying on excluded Dev files. |
| KI-105 | Legacy Golden | `scripts/validate-case01-golden.ts` and `test-data/case01_golden/**` remain locally but are not part of V1 RC. | Use only `scripts/golden/**` and `test-data/golden/**`. |
| KI-106 | MiniMax | A real MiniMax Golden run is not included in the current test record. | Configure and validate MiniMax separately; do not infer success from Mock results. |

## Deferred To V2

| ID | Area | Reason |
| --- | --- | --- |
| KI-201 | Golden audit integration | Provider audit metadata should become a consistent first-class API contract across every AI Workflow response. |
| KI-202 | Operational cleanup | Automated retention and archival policy for ignored Golden run artifacts is not included in V1. |

## Risk Controls

- Never run RC tests against the `lawdesk` product database.
- Golden must use caller declaration `GOLDEN_DATABASE_NAME=lawdesk_rc_test`.
- AI output remains Draft until lawyer confirmation.
- Unknown, malformed, or cross-Matter responses must fail closed.
