---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Today Application
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy: Only documentation typo fixes are allowed.
---

# 1. Purpose

Today Application defines the lawyer's daily command center.

Today Application composes Runtime, Matter, Task, AI and Notification into a daily work view.

Today Application is not Today UI.

Today Application is not Workflow.

## 2. Responsibilities

Today Application is responsible for composing:

- Today's Priorities
- Today's Matters
- Today's Tasks
- Pending Reviews
- Pending Confirmations
- AI Suggestions
- AI Drafts
- Notifications
- Calendar
- Recent Activity

## 3. Non-Responsibilities

Today Application does not define:

- Domain Model
- Business Rules
- Workflow
- Database Schema
- API Specification
- AI Runtime
- UI Components

## 4. Today Composition

Today Application includes:

- Priority Area
- Matter Area
- Task Area
- AI Area
- Review Area
- Notification Area
- Calendar Area
- Activity Area

Today Application coordinates these areas.

## 5. Runtime Relationship

Today Application reads Runtime.

Today Application never owns Runtime.

Today Application reflects current Runtime state.

## 6. AI Relationship

Today Application displays AI outputs.

AI outputs remain Suggestions.

Lawyer reviews.

Lawyer confirms.

Today Application never auto-confirms AI.

## 7. Task Relationship

Today Application displays Tasks.

Today Application never defines Task.

Today Application never changes Task directly.

Task changes go through Workflow Validation and API Executes.

## 8. Matter Relationship

Today Application displays Matters.

Today Application never defines Matter.

Today Application never changes Matter directly.

Matter remains Domain Object.

## 9. Notification Relationship

Today Application displays Notifications.

Notifications are Runtime signals.

Notifications do not change business state.

## 10. UI Relationship

Today Application uses Today UI.

Today Application never defines Today UI.

Today UI remains Presentation Layer.

## 11. Official Today Application Flow

Use ONE official execution flow only.

Runtime

↓

Today Application

↓

Today UI

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

Today Application Refresh

## 12. Constraints

Today Application:

does not define Domain Model

does not define Business Rules

does not define Workflow

does not define Database

does not define API

does not define AI Runtime

does not define UI Components

does not auto-confirm AI

does not auto-submit

## 13. Freeze Rules

Today Application is frozen for V1.

Future evolution belongs to V2.

## 14. Freeze Conclusion

Today Application Specification

Officially Frozen.

LawDesk V1.

## RC Audit

Read-only audit.

Verify:

1. Frozen Header
2. Document Structure
3. Responsibilities
4. Non-Responsibilities
5. Today Composition
6. Runtime Relationship
7. AI Relationship
8. Task Relationship
9. Matter Relationship
10. Notification Relationship
11. UI Relationship
12. Official Today Application Flow uniqueness
13. Constraints
14. Freeze Rules
15. Freeze Conclusion
16. Only docs/07_Development/07_Application/02_today_application.md was modified.

If everything passes output ONLY:

02_Today_Application RC Audit

PASS
