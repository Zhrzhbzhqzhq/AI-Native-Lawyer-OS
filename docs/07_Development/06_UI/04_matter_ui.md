---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Matter UI
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy: Only documentation typo fixes are allowed.
---

# 04_matter_ui.md

## 1. Purpose

Matter UI defines only the presentation layer of a Matter.

Matter UI displays Runtime information.

Matter UI never defines business logic.

## 2. Matter UI Responsibility

Matter UI is responsible for:

- Display Matter Summary
- Display Client
- Display Materials
- Display Evidence
- Display Documents
- Display Tasks
- Display Timeline
- Display Workflow Status
- Display AI Suggestions
- Display AI Records
- Collect User Actions
- Trigger approved API requests

Matter UI never owns business state.

## 3. Matter Workspace Layout

Matter Workspace contains:

Header

↓

Matter Summary

↓

Primary Workspace

↓

AI Panel

↓

Timeline

↓

Task Area

↓

Document Preview

Workspace is Runtime driven.

## 4. Matter Information Presentation

Matter UI presents:

- Matter Metadata
- Client Information
- Material List
- Evidence List
- Document List
- Task List
- Timeline
- Workflow Status

Presentation reflects Runtime only.

## 5. Matter Runtime View

Matter UI is a Runtime View.

Runtime includes:

- Current Matter State
- Current Workflow State
- Pending Tasks
- Pending Reviews
- Notifications

Matter UI never stores Runtime.

## 6. AI Presentation

Matter UI displays:

- AI Suggestions
- AI Drafts
- AI Confidence
- AI Pending Review
- AI Records

Matter UI never:

- auto-confirm AI
- auto-execute AI
- auto-submit AI results

Lawyer confirmation is always required.

## 7. User Actions

User

↓

Matter UI

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

Matter UI Refresh

Matter UI never bypasses this flow.

## 8. State Management

Matter UI state is limited to:

- UI Local State
- Runtime State
- API Response State

Matter UI never owns:

- Domain Model
- Workflow State
- Database State

## 9. Constraints

Matter UI:

does not define Matter

does not define Domain Model

does not define Workflow

does not define Database

does not define API

does not define AI Runtime

does not define Business Rules

does not bypass Workflow Validation

does not bypass API

does not auto-confirm AI

does not auto-submit

## 10. Official Matter UI Flow

Use ONE official Matter UI flow only.

Matter Runtime

↓

Matter UI Rendering

↓

User Interaction

↓

Workflow Validation

↓

Lawyer Confirms

↓

API Executes

↓

Runtime Refresh

↓

Matter UI Refresh

## 11. Freeze Rules

V1 Frozen.

Future Matter UI evolution belongs to V2.

## 12. Freeze Conclusion

Matter UI Specification

Officially Frozen.

LawDesk V1.

## RC Audit

Read-only audit.

Check:

1. Frozen Header
2. Chapter count
3. Matter UI Responsibility
4. Matter Workspace Layout
5. Matter Runtime View
6. AI Presentation
7. User Actions
8. State Management
9. Official Matter UI Flow uniqueness
10. Constraints
11. Freeze Conclusion
12. Only docs/07_Development/06_UI/04_matter_ui.md modified

If everything passes output ONLY:

04_Matter_UI RC Audit

PASS
