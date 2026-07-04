---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: AI UI
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy: Only documentation typo fixes are allowed.
---

# 06_ai_ui.md

## 1. Purpose

AI UI is the presentation layer of AI Runtime.

AI UI displays AI reasoning and AI output.

AI UI never makes business decisions.

AI UI never defines business rules.

## 2. AI UI Responsibility

AI UI is responsible for displaying:

- AI Suggestions
- AI Drafts
- AI Reviews
- AI Confidence
- AI Runtime Status
- AI Records
- AI Progress
- AI Tool Status
- AI History

AI UI collects user confirmation.

AI UI never owns business state.

## 3. AI Workspace Layout

Official layout

AI Header

↓

AI Runtime Status

↓

AI Suggestions

↓

AI Drafts

↓

AI Reviews

↓

AI Confidence

↓

AI History

↓

AI Records

Workspace is Runtime driven.

## 4. AI Runtime View

AI UI displays Runtime only.

Includes:

- Current AI Task
- Current AI Status
- Running Model
- Tool Status
- Context Version
- Runtime Progress

AI UI never stores Runtime.

## 5. AI Suggestions

Suggestions may include:

- Legal Strategy
- Evidence Analysis
- Legal Analysis Direction
- Draft Outline
- Risk Warning
- Next Action

Suggestions are recommendations only.

Suggestions never execute automatically.

## 6. AI Drafts

AI may generate:

- Documents
- Legal Drafts
- Checklists
- Reports
- Summaries
- Notes

Drafts remain editable.

Drafts never become official automatically.

## 7. AI Reviews

AI Review displays:

- Review Result
- Missing Information
- Potential Errors
- Risk Level
- Recommendation

Review never changes data.

## 8. AI Confidence

Display:

- Confidence Score
- Confidence Level
- Explanation
- Supporting Factors

Confidence is advisory only.

## 9. User Confirmation

Official confirmation flow

AI Output

↓

Lawyer Reviews

↓

Lawyer Confirms

↓

API Executes

↓

Database Updates

↓

Runtime Refresh

↓

AI UI Refresh

AI UI never bypasses confirmation.

## 10. State Management

AI UI state includes:

- UI Local State
- Runtime State
- API Response State

AI UI never owns:

- Domain Model
- Workflow State
- Database State

## 11. Constraints

AI UI

does not define Domain Model

does not define Workflow

does not define Database

does not define API

does not define Business Rules

does not modify Runtime

does not auto-confirm

does not auto-submit

does not bypass Workflow Validation

does not bypass Lawyer Confirmation

does not bypass API

AI UI is Presentation Layer only.

## 12. Official AI UI Flow

Use ONE official AI UI flow only.

AI Runtime

↓

AI UI Rendering

↓

Lawyer Reviews

↓

Lawyer Confirms

↓

API Executes

↓

Database Updates

↓

Runtime Refresh

↓

AI UI Refresh

## 13. Freeze Rules

V1 Frozen.

Future AI UI evolution belongs to V2.

## 14. Freeze Conclusion

AI UI Specification

Officially Frozen.

LawDesk V1.

## RC Audit

Read-only audit.

Check:

1. Frozen Header
2. Chapter count
3. AI UI Responsibility
4. AI Workspace Layout
5. AI Runtime View
6. AI Suggestions
7. AI Drafts
8. AI Reviews
9. AI Confidence
10. User Confirmation
11. Official AI UI Flow uniqueness
12. Constraints
13. Freeze Conclusion
14. Only docs/07_Development/06_UI/06_ai_ui.md modified

If everything passes output ONLY:

06_AI_UI RC Audit

PASS
