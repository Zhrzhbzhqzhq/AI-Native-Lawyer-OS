---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Matter Application
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy: Only documentation typo fixes are allowed.
---

# 1. Purpose

Matter Application defines the case work command center.

Matter Application composes Matter Runtime, Client, Material, Evidence, Document, Task, Timeline and AI into a usable case workspace.

Matter Application is not Matter UI.

Matter Application is not Workflow.

## 2. Responsibilities

Matter Application is responsible for composing:

- Matter Summary
- Client Information
- Material Area
- Evidence Area
- Document Area
- Task Area
- Timeline Area
- AI Suggestions
- AI Drafts
- Pending Reviews
- Workflow Status

## 3. Non-Responsibilities

Matter Application does not define:

- Domain Model
- Business Rules
- Workflow
- Database Schema
- API Specification
- AI Runtime
- UI Components

## 4. Matter Composition

Matter Application includes:

- Matter Overview
- Client Section
- Material Section
- Evidence Section
- Document Section
- Task Section
- Timeline Section
- AI Section
- Review Section

Matter Application coordinates these sections.

## 5. Runtime Relationship

Matter Application reads Runtime.

Matter Application never owns Runtime.

Matter Application reflects current Matter Runtime state.

## 6. AI Relationship

Matter Application displays AI outputs.

AI outputs remain Suggestions.

Lawyer reviews.

Lawyer confirms.

Matter Application never auto-confirms AI.

## 7. Evidence Relationship

Matter Application displays Evidence.

Matter Application never defines Evidence.

Matter Application never changes Evidence directly.

Evidence changes go through Workflow Validation and API Executes.

## 8. Document Relationship

Matter Application displays Documents.

Matter Application never defines Document.

Matter Application never changes Document directly.

Document changes go through Workflow Validation and API Executes.

## 9. Task Relationship

Matter Application displays Tasks.

Matter Application never defines Task.

Matter Application never changes Task directly.

Task changes go through Workflow Validation and API Executes.

## 10. Timeline Relationship

Matter Application displays Timeline.

Matter Application never defines Timeline.

Matter Application never appends Timeline directly.

Timeline updates occur through approved Runtime / API flow.

## 11. UI Relationship

Matter Application uses Matter UI.

Matter Application never defines Matter UI.

Matter UI remains Presentation Layer.

## 12. Official Matter Application Flow

Use ONE official execution flow only.

Runtime

↓

Matter Application

↓

Matter UI

↓

User Action

↓

Workflow Validation

↓

Lawyer Confirms

↓

API Executes

↓

Database Updates

↓

Runtime Refresh

↓

Matter Application Refresh

## 13. Constraints

Matter Application:

does not define Domain Model

does not define Business Rules

does not define Workflow

does not define Database

does not define API

does not define AI Runtime

does not define UI Components

does not auto-confirm AI

does not auto-submit

does not directly modify Evidence

does not directly modify Document

does not directly modify Task

does not directly append Timeline

## 14. Freeze Rules

Matter Application is frozen for V1.

Future evolution belongs to V2.

## 15. Freeze Conclusion

Matter Application Specification

Officially Frozen.

LawDesk V1.

## RC Audit

Read-only audit.

Verify:

1. Frozen Header
2. Document Structure
3. Responsibilities
4. Non-Responsibilities
5. Matter Composition
6. Runtime Relationship
7. AI Relationship
8. Evidence Relationship
9. Document Relationship
10. Task Relationship
11. Timeline Relationship
12. UI Relationship
13. Official Matter Application Flow uniqueness
14. Constraints
15. Freeze Rules
16. Freeze Conclusion
17. Only docs/07_Development/07_Application/03_matter_application.md was modified.

If everything passes output ONLY:

03_Matter_Application RC Audit

PASS
