---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Navigation
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy: Only documentation typo fixes are allowed.
---

# 07_navigation.md

## 1. Purpose

Navigation defines how users move between Runtime Views.

Navigation is responsible for orientation only.

Navigation never defines business logic.

Navigation never owns application state.

## 2. Navigation Responsibility

Navigation is responsible for:

- Global Navigation
- Workspace Switching
- Matter Navigation
- Breadcrumb
- Deep Link
- Navigation History
- Runtime View Switching

Navigation is not responsible for:

- Workflow
- Domain Model
- Business Rules
- Runtime
- Database

## 3. Global Navigation

Official Global Navigation

Today

↓

Matters

↓

Knowledge

↓

Workspace

↓

Settings

Global Navigation switches Runtime Views only.

## 4. Workspace Navigation

Workspace Navigation includes:

- Matter Workspace
- AI Workspace
- Knowledge Workspace
- Search Workspace

Workspace Navigation never changes Runtime.

## 5. Matter Navigation

Matter Navigation supports:

- Matter List
- Matter Detail
- Matter Timeline
- Matter Documents
- Matter Tasks

Navigation never changes Matter.

## 6. Breadcrumb

Breadcrumb displays:

Current Workspace

↓

Current Matter

↓

Current View

Breadcrumb is read-only.

## 7. Deep Link

Deep Link may open:

- Matter
- Task
- Timeline
- Document
- AI Record

Deep Link never executes business actions.

Deep Link opens Runtime View only.

## 8. Navigation State

Navigation State includes:

- Current Workspace
- Current View
- Current Matter
- History Stack

Navigation State never owns:

- Domain Model
- Workflow State
- Runtime State
- Database State

## 9. Constraints

Navigation

does not define Domain Model

does not define Workflow

does not define Runtime

does not define Database

does not define API

does not define Business Rules

does not modify Matter

does not execute API

does not bypass Workflow Validation

does not bypass Lawyer Confirmation

Navigation is View Routing only.

## 10. Official Navigation Flow

Use ONE official navigation flow only.

User Navigation

↓

Navigation Resolution

↓

Runtime View Selection

↓

Runtime Rendering

↓

UI Refresh

## 11. Freeze Rules

V1 Frozen.

Future Navigation evolution belongs to V2.

## 12. Freeze Conclusion

Navigation Specification

Officially Frozen.

LawDesk V1.

## RC Audit

Read-only audit.

Check:

1. Frozen Header
2. Chapter count
3. Navigation Responsibility
4. Global Navigation
5. Workspace Navigation
6. Matter Navigation
7. Breadcrumb
8. Deep Link
9. Navigation State
10. Official Navigation Flow uniqueness
11. Constraints
12. Freeze Conclusion
13. Only docs/07_Development/06_UI/07_navigation.md modified

If everything passes output ONLY:

07_Navigation RC Audit

PASS
