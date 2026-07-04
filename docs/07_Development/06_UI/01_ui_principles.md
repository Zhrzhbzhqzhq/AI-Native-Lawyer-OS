---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: UI Principles
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy: Only documentation typo fixes are allowed.
---

# 01_ui_principles.md

## 1. Purpose

UI is responsible only for presenting Runtime information and collecting user interactions.

UI is the presentation layer.

UI never owns business logic.

## 2. UI Responsibility

UI is responsible for:

- Display Runtime View
- Display Matter information
- Display Today Runtime
- Display AI Suggestions
- Display AI Records
- Display Workflow Status
- Collect User Input
- Trigger approved API requests
- Display execution results

## 3. UI Does NOT Define

UI does NOT define:

- Domain Model
- Workflow
- Database Schema
- API
- Business Rules
- Prompt
- Context
- AI Runtime

UI never becomes the source of truth.

## 4. Official UI Execution Flow

Use ONE official execution flow only.

User Action

↓

UI Displays

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

UI Refresh

UI never skips any step.

## 5. Runtime View

UI displays Runtime only.

Runtime View:

- Matter
- Today
- Workspace
- Timeline
- Workflow Status
- AI Suggestions
- AI Record

Runtime View is read from Runtime.

UI never owns Runtime.

## 6. API Boundary

UI calls API only through:

- User Action
- Approved Runtime Flow

UI does NOT:

- call Database directly
- bypass API
- bypass Validation

## 7. AI Boundary

UI displays:

- AI Suggestions
- AI Record
- AI Status
- AI Confidence
- AI Pending Review

UI never:

- confirms AI automatically
- executes AI automatically
- hides Lawyer Confirmation

## 8. Workflow Boundary

Workflow defines business state.

UI only reflects Workflow.

UI never:

- changes Workflow
- defines Workflow
- bypasses Workflow Validation

## 9. Domain Boundary

Domain Model defines business objects.

UI displays Domain information only.

UI never modifies Domain semantics.

## 10. Database Boundary

Database is Source of Truth.

UI never:

- writes Database directly
- reads Database directly
- bypasses API

## 11. User Interaction Principles

Every business action requires:

User

↓

UI

↓

Workflow Validation

↓

Lawyer Confirms

↓

API Executes

↓

Runtime Refresh

All confirmations belong to Lawyer.

## 12. Constraints

UI:

does not define business rules

does not define Workflow

does not define Domain Model

does not define Database

does not define API

does not execute AI

does not auto-confirm AI

does not auto-submit

does not auto-delete

does not auto-archive

## 13. Freeze Rules

V1 Frozen.

Future UI evolution belongs to V2.

## 14. Freeze Conclusion

UI Principles Specification

Officially Frozen.

LawDesk V1.

## RC Audit

Read-only audit.

Check:

1. Frozen Header
2. Chapter count
3. UI Responsibility
4. Official UI Execution Flow uniqueness
5. Runtime View boundary
6. API Boundary
7. AI Boundary
8. Workflow Boundary
9. Domain Boundary
10. Database Boundary
11. User Interaction Principles
12. Constraints
13. Freeze Conclusion
14. Only docs/07_Development/06_UI/01_ui_principles.md modified

If every item passes output ONLY:

01_UI_Principles RC Audit

PASS
