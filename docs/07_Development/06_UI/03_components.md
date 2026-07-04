---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: UI Components
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy: Only documentation typo fixes are allowed.
---

# 03_components.md

## 1. Purpose

UI Components define reusable presentation units.

Components display information and collect user interactions.

Components never contain business logic.

## 2. Component Principles

Official principles:

- Reusable
- Stateless by Default
- Runtime Driven
- API Driven
- AI Native
- Consistent
- Predictable
- Composable

Components never own business state.

## 3. Component Categories

Official component categories:

Display Components

- Card
- Table
- List
- Timeline
- Badge
- Tag
- Status

Interaction Components

- Button
- Input
- Search
- Filter
- Dialog
- Drawer
- Menu

AI Components

- AI Suggestion Card
- AI Status
- AI Confidence
- AI Pending Review
- AI Action Panel

Runtime Components

- Matter Card
- Task Card
- Today Card
- Timeline Item
- Notification

## 4. Runtime Components

Runtime Components display:

- Matter
- Task
- Timeline
- Workflow Status
- Today
- Workspace
- Notifications

Runtime Components are read-only representations of Runtime state.

## 5. AI Components

AI Components display:

- Suggestions
- Drafts
- Reviews
- Confidence
- AI Record
- Pending Review

AI Components never:

- auto-confirm
- auto-execute
- auto-submit

Lawyer confirmation is always required.

## 6. Interaction Components

Interaction Components:

collect user input

↓

trigger API requests

↓

display execution results

Interaction Components never define business rules.

## 7. State Management

Component state is limited to:

- UI Local State
- Runtime State
- API Response State

Components never own:

- Domain Model
- Workflow State
- Database State

## 8. Component Composition

Components compose into:

Navigation

↓

Workspace

↓

Matter

↓

Panels

↓

Cards

↓

Controls

Composition never changes business behavior.

## 9. Constraints

Components:

do not define Domain Model

do not define Workflow

do not define Database

do not define API

do not define AI Runtime

do not define Business Rules

do not bypass Validation

do not bypass API

do not auto-confirm AI

do not auto-submit

## 10. Official Component Flow

Use ONE official component flow only.

Runtime

↓

Component Rendering

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

Component Refresh

## 11. Freeze Rules

V1 Frozen.

Future component evolution belongs to V2.

## 12. Freeze Conclusion

UI Components Specification

Officially Frozen.

LawDesk V1.

## RC Audit

Read-only audit.

Check:

1. Frozen Header
2. Chapter count
3. Component Categories
4. Runtime Components
5. AI Components
6. Interaction Components
7. State Management
8. Component Composition
9. Official Component Flow uniqueness
10. Constraints
11. Freeze Conclusion
12. Only docs/07_Development/06_UI/03_components.md modified

If everything passes output ONLY:

03_UI_Components RC Audit

PASS
