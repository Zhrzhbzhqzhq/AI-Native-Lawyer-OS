---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Event Object Relationship
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 13_event_object_relationship

## 1. Purpose

本文件定义 LawDesk Event Object Relationship。

用于冻结：

- Timeline
- Workflow Event
- AI Record

之间的职责边界。

---

## 2. Event Object Classification

Business Entity

- Matter
- Client
- Material
- Evidence
- Document
- Task

Event Entity

- Timeline
- Workflow Event
- AI Record

---

## 3. Timeline

Timeline：

records business history.

records what happened in Matter.

does not execute Workflow.

does not record Workflow Runtime internals.

does not record AI Runtime internals.

---

## 4. Workflow Event

Workflow Event：

records Workflow Runtime events.

records Workflow execution.

may append Timeline.

may refresh Runtime.

does not replace Timeline.

does not modify Domain Object.

---

## 5. AI Record

AI Record：

records AI Runtime work.

records AI analysis.

records AI draft.

records AI review.

may append Timeline.

does not replace Timeline.

does not replace Workflow Event.

---

## 6. Dependency

唯一允许关系：

Workflow Event

↓

Timeline

AI Record

↓

Timeline

禁止：

Timeline

↓

Workflow Event

Timeline

↓

AI Record

---

## 7. Official Relationship

Matter

│

├── Timeline

│

├── Workflow Event

│      │

│      └────► Timeline

│

└── AI Record

       │

       └────► Timeline

---

## 8. Constraints

Timeline

never creates Workflow Event.

Timeline

never creates AI Record.

Workflow Event

never replaces Timeline.

AI Record

never replaces Timeline.

Workflow Event

and

AI Record

are independent.

---

## 9. Freeze Rules

本关系自 V1 起冻结。

任何调整进入 V2。

---

## 10. Freeze Conclusion

Event Object Relationship

is officially frozen.

Workflow Runtime

AI Runtime

Today Runtime

必须遵守本规范。