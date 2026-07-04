---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: AI Boundary
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
Only documentation typo fixes are allowed.
---

# 04_ai_boundary.md

## 1. Purpose

AI Boundary defines AI permissions.

It is not:

- Runtime
- Workflow
- Domain
- Database
- API

## 2. AI Capability

AI may:

- Analyze
- Suggest
- Draft
- Review
- Summarize
- Compare
- Extract
- Translate
- Organize
- Classify

AI produces Suggestions.

AI never makes Business Decisions.

## 3. AI Forbidden Operations

AI does not:

- modify Domain Object
- create Domain Object
- delete Domain Object
- change Matter Status
- execute Workflow
- define Workflow
- bypass Validation
- call API directly
- write Database directly
- confirm Lawyer decisions
- replace Lawyer

## 4. Workflow Boundary

Workflow Boundary references the official execution chain in Section 11.

AI does not drive Workflow.

AI does not define Workflow.

AI does not change Workflow.

## 5. Domain Boundary

AI may:

- Read
- Analyze
- Suggest

AI does not:

- own Domain Object
- modify Domain Object
- persist Domain Object

## 6. API Boundary

AI does not:

POST

PATCH

DELETE

Only:

Lawyer Confirms

↓

API Executes

## 7. Database Boundary

AI does not:

INSERT

UPDATE

DELETE

Official persistence path:

AI

↓

API Executes

↓

Database Updates

## 8. AI Record Boundary

Official persistence path:

AI Runtime

↓

AI Record

↓

API

↓

Database

↓

ai_records

AI Runtime never writes Database directly.

## 9. Tool Boundary

AI may call Tools.

Tools must never bypass:

- Workflow Validation
- Lawyer Confirmation
- API Boundary

## 10. Lawyer Boundary

Final authority belongs to Lawyer.

Lawyer may:

- Accept
- Reject
- Edit
- Retry
- Execute

AI never has final authority.

## 11. Official Execution Chain

Use ONE official execution chain only.

User

↓

Workflow Validation

↓

AI Analyze

↓

AI Suggest

↓

Lawyer Confirms

↓

API Executes

↓

Database Updates

↓

Workflow Event

↓

Timeline

↓

Runtime Refresh

Do NOT introduce another execution chain.

## 12. Constraints

AI Boundary defines ONLY:

AI permissions.

It does NOT define:

- Domain
- Workflow
- Database
- API

## 13. Freeze Rules

LawDesk V1 freezes AI Boundary.

The following belong to V2:

- Autonomous AI
- Agent Collaboration
- Automatic Execution
- Background AI

## 14. Freeze Conclusion

AI Boundary Specification

Officially Frozen.

LawDesk V1 AI follows:

AI analyzes.

AI suggests.

Lawyer decides.

API executes.

Database persists.
