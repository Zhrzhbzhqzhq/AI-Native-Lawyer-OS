---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Context Assembly
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
Only documentation typo fixes are allowed.
---

# 06_context_assembly.md

## 1. Purpose

Context Assembly is the only data entry layer for AI Runtime.

Context Assembly is responsible for:

- Context Collection
- Context Filtering
- Context Ranking
- Context Packaging
- Context Snapshot

Context Assembly is not responsible for:

- Workflow
- Domain Model
- API
- Database
- Prompt
- AI Decision

Context Assembly organizes information.

Context Assembly never makes decisions.

## 2. Official Context Sources

Official Context Sources:

- Matter
- Client
- Material
- Evidence
- Document
- Timeline
- Knowledge
- Workspace
- AI Record

State clearly:

All Context Sources are read-only.

No Context Source modifies Domain Objects.

Adding new Context Source belongs to V2.

## 3. Context Collection

Official collection priority:

Runtime

↓

Database

↓

Knowledge

↓

Workspace

↓

AI Record

State clearly:

Runtime has the highest freshness priority.

Database is Source of Truth.

Knowledge never overrides Runtime.

AI Record never overrides Runtime.

Workspace never overrides Domain Object.

## 4. Context Filtering

Context Filtering uses:

- Priority
- Relevance
- Freshness
- Security
- Matter Isolation

State clearly:

Context Filtering removes irrelevant information.

Context Filtering never changes Domain Objects.

Context Filtering never bypasses Validation.

Context Filtering never crosses Matter boundaries.

## 5. Context Ranking

Official ranking rule:

Matter

>

Current Workflow State

>

Current Task

>

Evidence

>

Timeline

>

Knowledge

>

AI Record

>

Workspace

State clearly:

Higher Rank always wins.

Only ONE Context Ranking rule exists.

## 6. Context Packaging

Official packaging chain:

Context

↓

Structured Context

↓

Prompt Context

↓

Prompt Assembly

State clearly:

Context is not Prompt.

Context Packaging does not define Prompt Architecture.

Context Packaging prepares information for Prompt Assembly.

## 7. Context Freshness

Freshness priority:

Runtime

>

Database

>

Knowledge

>

Cache

State clearly:

Newest valid data must be used.

Stale Context is prohibited when newer valid data exists.

Cache never overrides Runtime.

Cache never overrides Database.

## 8. Matter Isolation

Official rule:

One Matter

↓

One Context

State clearly:

Context must never cross Matter boundaries.

Cross-Matter Context belongs to V2.

Cross-Matter Knowledge Fusion belongs to V2.

## 9. Context Budget

Context Budget includes:

- Token
- Image
- Attachment
- Tool Output

State clearly:

High-rank Context is retained first.

Low-rank Context may be truncated.

Truncation must preserve semantic integrity.

## 10. Context Boundary

Context does not:

- modify Domain
- modify Workflow
- modify Database
- modify Prompt
- modify API
- bypass Validation
- bypass Lawyer Confirmation

Context only supplies information.

## 11. Context Versioning

Each Context Assembly has:

- context_id
- matter_id
- context_version
- snapshot_time
- created_at

State clearly:

Context Assembly is version controlled.

Context Assembly can be referenced by AI Record.

## 12. Context Snapshot

Official snapshot chain:

Database

↓

Context Snapshot

↓

Prompt

↓

AI Runtime

Context Snapshot guarantees:

- Auditability
- Traceability
- Reproducibility
- Reviewability

State clearly:

AI consumes Context Snapshot.

AI Record may reference Context Snapshot.

Context Snapshot does not modify Domain Objects.

## 13. Constraints

Context Assembly must remain:

- Read-only
- Composable
- Auditable
- Matter-isolated
- Version controlled
- Deterministic

Context Assembly must never:

- create Domain Objects
- modify Domain Objects
- bypass Validation
- bypass Lawyer Confirmation
- write Database
- execute API

## 14. Freeze Rules

LawDesk V1 freezes Context Assembly.

The following belong to V2:

- Cross-Matter Context
- Long-term Memory Fusion
- Automatic Context Compression
- Dynamic Context Planner
- Multi-Agent Shared Context
- Context Source Plugin

## 15. Freeze Conclusion

Use exactly:

Context Assembly Specification

Officially Frozen.

LawDesk V1 Context Assembly follows:

Context is collected.

Context is filtered.

Context is ranked.

Context is packaged.

Context Snapshot is created.

AI consumes Context Snapshot.

## RC Audit

After completion perform a read-only RC Audit.

Check:

1. Golden Template
2. Context Sources
3. Context Collection
4. Context Filtering
5. Context Ranking
6. Context Packaging
7. Context Freshness
8. Matter Isolation
9. Context Budget
10. Context Boundary
11. Context Versioning
12. Context Snapshot
13. Freeze Header
14. Cross-reference completeness
15. Only target file changed

Output only:

06_Context_Assembly RC Audit

PASS / FAIL
