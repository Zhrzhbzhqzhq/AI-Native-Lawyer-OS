---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Workflow Event
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 09_workflow_event

## 1. Purpose

Workflow Event 定义 LawDesk 的 Workflow Runtime 事件对象（Workflow Runtime Event）。

Workflow Event 用于记录 Workflow Runtime 内部发生的事件。

例如：

- Workflow Started
- Workflow Completed
- Workflow Failed
- Workflow Paused
- Workflow Resumed
- Workflow Cancelled
- Workflow Routed
- Workflow Approved

Workflow Event 是 Domain Object。

Workflow Event 不是 Timeline。

Workflow Event 不是 Runtime。

Workflow Event 不是 Today。

Workflow Event 不负责驱动业务流程。

---

## 2. Responsibilities

Workflow Event 负责：

- Workflow Event Identity
- Workflow Event Type
- Workflow Event Time
- Workflow Event Source
- Workflow Event Payload
- Related Matter
- Related Workflow
- Related Timeline

Workflow Event 不负责：

- Business History Display
- Workflow Execution
- Domain Object Modification
- AI Runtime Work Record
- Today Generation

Workflow Event does not replace Timeline.

Workflow Event does not replace AI Record.

Workflow Event is not Timeline.

Workflow Event does not execute Workflow.

Workflow Event does not own Domain Object.

Workflow Event = Workflow Runtime Event.

---

## 3. Identity

Identity：

- workflow_event_id

Identity Immutable.

---

## 4. Aggregate Relationship

Workflow Event belongs to Matter.

Workflow Event is not an Aggregate Root.

Matter is the only Aggregate Root.

---

## 5. Ownership

Ownership belongs to Matter.

Cross-Matter Ownership is prohibited.

---

## 6. Relationships

Workflow Event 可以引用：

- Matter
- Workflow
- Timeline
- Task
- Document
- Evidence
- AI Record

Reference does not equal Ownership.

---

## 7. Lifecycle

Workflow Event Lifecycle：

Created

↓

Recorded

↓

Consumed

↓

Archived

Matter Lifecycle 对 Workflow Event Lifecycle 生效。

Workflow Runtime 决定 Workflow Event 产生时机。

Workflow Event 不负责状态迁移。

---

## 8. Workflow Relationship

Workflow Runtime 可以：

- Create Workflow Event
- Consume Workflow Event
- Append Timeline from Workflow Event
- Refresh Runtime from Workflow Event

Workflow Event 不拥有 Workflow。

Workflow Event 不定义 Workflow。

Workflow Event 不执行 Workflow。

Workflow Event 不驱动 Workflow。

Workflow Event 仅记录 Workflow Runtime 已发生的事件。

---

## 9. Database Mapping

保持官方唯一 Mapping：

Workflow Event

↓

Database Schema

↓

API Resource

↓

Workflow Runtime

↓

Today Runtime

---

## 10. API Relationship

不得重新定义 Mapping。

引用第 9 节官方 Mapping。

API：

仅作为 Domain Model 的访问接口。

API 不拥有 Workflow Event。

API 不定义 Workflow Event。

---

## 11. AI Relationship

AI 可以：

- Analyze
- Review
- Summarize

AI 不可以：

- Modify Workflow Event
- Delete Workflow Event
- Change Workflow Event Lifecycle
- Fabricate Workflow Event

统一执行链：

Lawyer Confirms

↓

API Executes

↓

Database Updates

---

## 12. Constraints

Workflow Event 不得：

- 定义 Workflow
- 执行 Workflow
- 修改 Domain Object
- 替代 Timeline
- 替代 AI Record
- 定义 API
- 定义 Database
- 定义 Runtime

Workflow Event may append Timeline.

Timeline never creates Workflow Event.

Workflow Event and AI Record are independent.

---

## 13. Freeze Rules

本关系自 V1 起冻结。

任何调整进入 V2。

---

## 14. V2 Reserved

未来可考虑：

- Event Replay
- Event Subscription
- Event Bus
- External Webhook
- Distributed Workflow Event
- Workflow Event Analytics

---

## 15. Freeze Conclusion

Workflow Event is officially frozen.

Workflow Runtime

AI Runtime

Today Runtime

必须遵守本规范。
