---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Today UI
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy: Only documentation typo fixes are allowed.
---

# 05_today_ui.md

## 1. Purpose

Today UI is the default workspace of LawDesk.

Today UI displays the lawyer's current Runtime.

Today UI is not a Matter list.

Today UI never defines business rules.

## 2. Today UI Responsibility

Today UI is responsible for displaying:

- Today's Matters
- Today's Tasks
- Pending Reviews
- Pending Confirmations
- AI Suggestions
- Notifications
- Calendar
- Recent Activity
- Runtime Status

Today UI collects user actions.

Today UI never owns business state.

## 3. Today Workspace Layout

Official layout:

Header

↓

AI Workspace

↓

Today's Priorities

↓

Pending Tasks

↓

Pending Reviews

↓

Today's Matters

↓

Notifications

↓

Calendar

↓

Recent Activity

Workspace layout is Runtime driven.

## 4. Runtime Dashboard

Dashboard displays only Runtime information.

Includes:

- Active Matters
- Due Tasks
- Pending Workflow
- Pending Confirmation
- AI Runtime Status
- Notification Status

Dashboard never modifies Runtime.

## 5. AI Workspace

AI Workspace displays:

- AI Suggestions
- AI Drafts
- AI Reviews
- AI Confidence
- AI Pending Review
- AI Runtime Status

AI Workspace never:

- auto-confirm
- auto-execute
- auto-submit

Lawyer confirmation is always required.

## 6. User Actions

Official flow:

User

↓

Today UI

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

Today UI Refresh

Today UI never bypasses this flow.

## 7. State Management

Today UI state is limited to:

- UI Local State
- Runtime State
- API Response State

Today UI never owns:

- Domain Model
- Workflow State
- Database State

## 8. Constraints

Today UI:

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

Today UI is Runtime View only.

## 9. Official Today UI Flow

Use ONE official Today UI flow only.

Runtime

↓

Today UI Rendering

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

Today UI Refresh

## 10. Freeze Rules

V1 Frozen.

Future Today UI evolution belongs to V2.

## 11. Freeze Conclusion

Today UI Specification

Officially Frozen.

LawDesk V1.

## RC Audit

Read-only audit.

Check:

1. Frozen Header
2. Chapter count
3. Today UI Responsibility
4. Workspace Layout
5. Runtime Dashboard
6. AI Workspace
7. User Actions
8. State Management
9. Official Today UI Flow uniqueness
10. Constraints
11. Freeze Conclusion
12. Only docs/07_Development/06_UI/05_today_ui.md modified

If everything passes output ONLY:

05_Today_UI RC Audit

PASS
