# LawDesk V1 Release Notes

## Release Information

- Product: LawDesk — AI Native Lawyer Operating System
- Version: V1.0 RC
- Baseline commit: `181c120 Add V1 golden case validation`
- Release date: pending RC deployment approval
- Release type: Release Candidate

## Highlights

LawDesk V1 provides a Matter-centered lawyer Workspace in which AI prepares reviewable Drafts and lawyers retain control over formal legal work.

## Added In V1

### Draft Workflow

- Persistent FactDraft, IssueDraft, LawDraft, ArgumentDraft, and DocumentDraft workflows.
- Explicit review-state allow-lists and transactional publication.
- Idempotency, source validation, cross-Matter protection, and publication integrity checks.

### Human In The Loop

- AI generates Drafts only.
- Fact, Issue, Law, and Argument require accepted status before publication.
- Document requires ready_to_publish status before publication.
- Published formal objects become read-only in the V1 Workspace.

### Backend Runtime

- Explicit AI Provider boundary for Mock and MiniMax.
- Production Mock fallback is prohibited.
- Intake and Document pipelines preserve Draft-only behavior.
- Runtime logging excludes API keys, full prompts, case bodies, and full model responses.

### Frontend Workspace

- Today, Intake, Matter, Evidence, Facts, Issues, Laws, Arguments, Documents, Research, Runtime, and Execution Workspaces.
- Strict distinction between empty data, request failure, invalid JSON, and invalid response structure.
- Removal of fixed legal conclusions, demo activities, and fabricated business fallbacks.

### Intake

- Real file persistence with safe filenames, type and size limits, duplicate detection, and rollback on batch failure.
- Strict upload response validation before analysis can begin.

### Documents And DOCX

- DocumentDraft review and publication workflow.
- Published pointer integrity and formal-status validation.
- DOCX export restricted to published, completed, or final Documents.

### Regression

- Backend Draft and Document Workflow regression coverage.
- Frontend Workspace and strict response-contract coverage.
- Database isolation safeguards for RC tests.

### Golden Validation

- Case01 private-lending synthetic Golden Dataset.
- Deterministic Validator and Scoring tests.
- P0 hard failures for confirmation, provenance, source integrity, Matter isolation, unsafe content, and Document status.
- Ignored per-run actual outputs and auditable metadata fields.

## Compatibility

- Database: PostgreSQL
- Package manager: pnpm 9.12.0
- Backend: Node.js TypeScript service
- Frontend: Next.js
- AI Providers: Mock for explicit non-production verification; MiniMax for configured runtime use

## Known Issues

See `V1_Known_Issues.md`.

## Release Decision

Automated RC validation is complete. Final production release remains subject to deployment and post-deployment verification.
