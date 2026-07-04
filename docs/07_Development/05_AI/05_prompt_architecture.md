---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Prompt Architecture
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
Only documentation typo fixes are allowed.
---

# 05_prompt_architecture.md

## 1. Purpose

Prompt Architecture defines:

- Prompt hierarchy
- Prompt composition
- Prompt responsibility
- Prompt execution order

Prompt Architecture does NOT define:

- Business Rules
- Workflow
- Domain Model
- Database
- API

## 2. Prompt Layers

Define exactly six layers.

System Prompt

↓

Role Prompt

↓

Task Prompt

↓

Context Prompt

↓

Tool Prompt

↓

Output Format Prompt

State clearly:

Each layer has a single responsibility.

No layer replaces another layer.

## 3. System Prompt

Defines only:

- Global AI behavior
- Safety
- Identity
- Language
- Global constraints

System Prompt does NOT define:

- Matter
- Client
- Workflow
- Task
- Business Rules

## 4. Role Prompt

Defines only:

AI role.

Examples:

- Chief AI
- Litigation Assistant
- Evidence Analyst
- Research Assistant
- Document Reviewer

Role Prompt does NOT define:

Workflow.

## 5. Task Prompt

Defines only:

Current task.

Examples:

- Draft Complaint
- Analyze Evidence
- Review Contract
- Summarize Timeline

Task Prompt never defines:

Business Rules.

## 6. Context Prompt

Context may include:

Matter

Client

Material

Evidence

Document

Timeline

Knowledge

Workspace

AI Record

State clearly:

Context is read-only.

Context never changes Domain Objects.

## 7. Tool Prompt

Defines only:

Tool invocation guidance.

Prompt never executes Tool directly.

Prompt never bypasses:

Workflow Validation

Lawyer Confirmation

API Boundary

## 8. Output Format Prompt

Defines only:

Output structure.

Examples:

Markdown

JSON

Table

Checklist

Outline

Output Format never changes business meaning.

## 9. Prompt Assembly Order

Official assembly order:

System Prompt

↓

Role Prompt

↓

Task Prompt

↓

Context Prompt

↓

Tool Prompt

↓

Output Format Prompt

↓

Final Prompt

Use ONE official assembly chain only.

## 10. Prompt Boundary

Prompt does NOT:

define Domain

define Workflow

define Validation

define Database

define API

define Runtime

Prompt only organizes AI input.

## 11. Versioning

Every Prompt has:

Prompt ID

Prompt Version

Created At

Updated At

Author

Status

State:

Prompt changes are version controlled.

## 12. Constraints

Prompt Architecture must remain:

Deterministic

Composable

Reusable

Auditable

Versioned

Prompt must never contain:

Hidden business rules.

## 13. Freeze Rules

LawDesk V1 freezes Prompt Architecture.

The following belong to V2:

- Dynamic Prompt Planning
- Self-modifying Prompt
- Prompt Learning
- Automatic Prompt Optimization
- Multi-Agent Prompt Negotiation

## 14. Freeze Conclusion

Use exactly:

Prompt Architecture Specification

Officially Frozen.

LawDesk V1 Prompt Architecture follows:

System defines behavior.

Role defines identity.

Task defines work.

Context provides information.

Tool provides capability.

Output defines format.

## RC Audit (Read Only)

After completion perform a read-only RC Audit.

Check:

1. Golden Template
2. Prompt Layers
3. System Prompt Boundary
4. Role Prompt Boundary
5. Task Prompt Boundary
6. Context Boundary
7. Tool Boundary
8. Output Boundary
9. Prompt Assembly Order uniqueness
10. Prompt Versioning
11. Constraints
12. Freeze Header
13. Cross-reference completeness

Output only:

05_Prompt_Architecture RC Audit

PASS / FAIL
