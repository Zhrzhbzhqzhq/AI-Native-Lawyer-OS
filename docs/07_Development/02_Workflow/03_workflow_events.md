---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Workflow Events
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 03_workflow_events

## 1. Event Purpose

Workflow Event 定义 Matter 在 Workflow 生命周期中的关键业务事件。

Workflow Event 用于记录业务状态变化，并驱动 Timeline、Today、AI Runtime 等系统组件保持一致。

Workflow Event 不直接修改业务对象，仅描述已经发生或即将发生的业务事件。

---

## 2. Event Principles

- Workflow Driven
- Matter Centered
- Event Driven
- Immutable Events
- API Executes
- Database Records Truth
- Timeline Reflects Events

Workflow Event 由 Workflow 产生，由 API 执行业务更新，由 Database 保存最终业务状态。

---

## 3. Event Types

Workflow Event 包括但不限于：

- Matter Created
- Matter Accepted
- Matter Started
- Matter Stage Changed
- Matter Closed
- Matter Archived
- Task Created
- Task Completed
- Timeline Updated
- Deadline Updated
- AI Suggestion Generated
- AI Suggestion Confirmed

新增 Event 类型属于 V2。

---

## 4. Standard Event Structure

每一个 Workflow Event 至少包含：

- event_id
- event_type
- event_version
- matter_id
- workflow_id
- actor
- source
- occurred_at
- payload

说明：

event_id 全局唯一。

event_version 用于 Event Schema 的版本管理。

occurred_at 表示事件实际发生时间。

payload 保存事件上下文信息。

---

## 5. Workflow Event Producers

Workflow Event 可以由以下组件产生：

- Workflow Engine
- API
- Today Runtime
- AI Runtime
- Scheduler（V2）

所有 Event 必须经过 Workflow 校验。

---

## 6. Workflow Event Consumers

Workflow Event 可驱动：

- Timeline
- Today
- AI Runtime
- Notification（V2）
- Audit（V2）
- Analytics（V2）

Event Consumer 不直接修改业务状态。

---

## 7. Event Ordering

同一 Matter 的 Workflow Event 必须保持时间顺序。

事件顺序应满足：

Workflow

↓

Event

↓

API

↓

Database

↓

Timeline

↓

Today

↓

AI Runtime

不得出现逆序执行。

Database 始终保存最终业务状态（Source of Truth）。

---

## 8. Event Idempotency

Workflow Event 必须支持幂等处理。

相同 event_id：

只能处理一次。

重复事件不得重复修改业务对象。

---

## 9. Event Persistence

所有 Workflow Event 应保存事件记录。

事件记录用于：

- Timeline
- 历史追踪
- 调试分析
- AI 学习
- Audit（V2）

Database 保存 Workflow 执行后的最终业务状态（Source of Truth）。

Workflow Event 保存业务变化历史。

---

## 10. Workflow Event and Timeline

Timeline 根据 Workflow Event 自动生成。

Timeline 不直接决定业务状态。

Timeline 是 Workflow Event 的业务展示。

---

## 11. Workflow Event and Today

Today 根据 Workflow Event 自动刷新。

可生成：

- 今日任务
- 下一步建议
- 风险提醒
- AI 待确认成果

Today 不保存业务状态。

Today 为 Runtime 视图。

---

## 12. Workflow Event and AI Runtime

AI Runtime 监听 Workflow Event。

AI 可以：

- Analyze
- Suggest
- Draft
- Review
- Summarize

AI 不可以：

- Confirm
- Submit
- Archive
- Delete
- Skip Workflow

AI 所有业务操作必须通过 API。

---

## 13. Event Constraints

- Workflow Event 不得直接修改业务对象。
- Workflow Event 必须属于某一 Matter。
- Workflow Event 必须遵循 Workflow 顺序。
- Workflow Event 不得绕过 Workflow。
- Workflow Event 不得重复消费。
- Workflow Event 不得作为业务状态唯一来源。

Database 始终保存最终业务状态（Source of Truth）。

---

## 14. Workflow Event Freeze Rules

V1 Workflow Event 已冻结。

Workflow Event 语义不得修改。

已发布 Event Type 不得删除。

已发布 Event Type 不得复用。

新增 Event Type 属于 V2。

---

## 15. V2 Reserved

未来可考虑：

- Event Bus
- External Event Subscription
- Webhook
- Distributed Event Processing
- Event Replay
- Cross-System Integration

---

## 16. Freeze Conclusion

该文档定义 LawDesk V1 Workflow Event 官方规范。

Workflow Event 是 Workflow、Timeline、Today 与 AI Runtime 之间的统一事件规范。

本规范自 V1 起正式冻结。

Database、API、Workflow、AI Runtime、Frontend 及后续 V1 功能开发必须遵守本规范。

任何 Workflow Event 语义修改必须进入 V2。
