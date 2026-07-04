---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: UI Layout
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy: Only documentation typo fixes are allowed.
---

# 02_layout.md

## 1. Purpose

UI Layout defines only the presentation layout.

Layout organizes information.

Layout never defines business logic.

## 2. Layout Principles

Official principles:

- Workspace First
- Matter First
- Today First
- AI Native
- Runtime Driven
- Information Density
- Minimal Cognitive Load
- Consistent Layout
- Desktop First

Layout never owns business state.

## 3. Workspace Layout

Workspace is the primary working area.

Workspace contains:

- Today
- Matter
- AI Panel
- Timeline
- Task
- Document Preview

Workspace is always runtime driven.

## 4. Today Layout

Today is the default landing page.

Today displays:

- Today's Tasks
- Today's Matters
- AI Suggestions
- Pending Reviews
- Calendar
- Notifications

Today is a Runtime View.

Today never owns business state.

## 5. Matter Layout

Matter is the primary business workspace.

Matter displays:

- Matter Summary
- Client
- Material
- Evidence
- Document
- Timeline
- Workflow Status
- AI Suggestions
- AI Record

Matter Layout reflects Runtime only.

## 6. Navigation Layout

Navigation contains only navigation.

Recommended navigation:

- Today
- Matters
- Knowledge
- Workspace
- Settings

Navigation never contains business logic.

## 7. Panel Layout

Panels include:

Left Panel

↓

Navigation

Center Panel

↓

Primary Workspace

Right Panel

↓

AI Assistant
Details
Context
Preview

Panels never own data.

## 8. Responsive Layout

Desktop First.

Tablet supported.

Mobile belongs to V2.

Responsive changes layout only.

Responsive never changes business behavior.

## 9. Constraints

UI Layout:

does not define Domain Model

does not define Workflow

does not define Database

does not define API

does not define AI Runtime

does not define Business Rules

does not own Runtime

does not own Matter

## 10. Official UI Layout Flow

Use ONE official layout flow only.

User

↓

Navigation

↓

Workspace

↓

Matter / Today

↓

AI Panel

↓

Runtime Refresh

↓

UI Refresh

## 11. Freeze Rules

V1 Frozen.

Future layout evolution belongs to V2.

## 12. Freeze Conclusion

UI Layout Specification

Officially Frozen.

LawDesk V1.

## RC Audit

Read-only audit.

Check:

1. Frozen Header
2. Chapter count
3. Workspace Layout
4. Today Layout
5. Matter Layout
6. Navigation Layout
7. Panel Layout
8. Responsive Layout
9. Official Layout Flow uniqueness
10. Constraints
11. Freeze Conclusion
12. Only docs/07_Development/06_UI/02_layout.md modified

If everything passes output ONLY:

02_UI_Layout RC Audit

PASS
