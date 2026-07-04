---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Timeline
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 08_timeline

## 1. Purpose

Timeline 定义 LawDesk 的案件时间线对象（Timeline）。

Timeline 用于记录案件生命周期中已经发生的重要事件。

例如：

- 客户咨询
- 接案
- 材料上传
- 证据整理
- 法律检索
- 文书生成
- 法院立案
- 开庭
- 判决
- 执行
- 结案
- AI 工作记录

Timeline 是 Domain Object。

Timeline 不是 Workflow。

Timeline 不是 Runtime。

Timeline 不是 Today。

Timeline 不负责驱动业务流程。

---

## 2. Responsibilities

Timeline 负责：

- Timeline Identity
- Event Time
- Event Type
- Event Description
- Event Source
- Related Matter
- Related Task
- Related Document
- Related Evidence

Timeline is a business history record.

Timeline records what happened in the Matter.

Timeline 不负责：

- Workflow
- Runtime
- Today Generation
- State Transition
- Event Trigger

Timeline does not record Workflow Runtime internals by default.

Timeline does not record AI Runtime internals by default.

Workflow Event records Workflow Runtime events.

AI Record records AI Runtime work.

Timeline does not replace Workflow Event.

Timeline does not replace AI Record.

---

## 3. Identity

Identity：

- timeline_id

Identity Immutable.

---

## 4. Aggregate Relationship

Timeline belongs to Matter.

Timeline is not an Aggregate Root.

Matter is the only Aggregate Root.

---

## 5. Ownership

Ownership belongs to Matter.

Cross-Matter Ownership is prohibited.

---

## 6. Relationships

Timeline 可以引用：

- Matter
- Task
- Document
- Material
- Evidence
- AI Record
- Knowledge

Reference does not equal Ownership.

---

## 7. Lifecycle

Timeline Lifecycle：

Created

↓

Recorded

↓

Archived

Matter Lifecycle 对 Timeline Lifecycle 生效。

Workflow 决定事件记录时机。

Timeline 不负责状态迁移。

---

## 8. Workflow Relationship

Workflow 可以：

- Create Timeline Event
- Append Timeline Event

Workflow 不拥有 Timeline。

Workflow 不定义 Timeline。

Timeline 不驱动 Workflow。

Timeline 仅记录 Workflow 已发生的事件。

---

## 9. Database Mapping

保持官方唯一 Mapping：

Timeline

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

API 不拥有 Timeline。

API 不定义 Timeline。

---

## 11. AI Relationship

AI 可以：

- Analyze
- Review
- Summarize

AI 不可以：

- Modify Timeline
- Delete Timeline
- Change Timeline Lifecycle
- Fabricate Timeline Event

统一执行链：

Lawyer Confirms

↓

API Executes

↓

Database Updates

---

## 12. Constraints

Timeline 不得：

- 定义 Workflow
- 定义 API
- 定义 Database
- 定义 Runtime
- 定义 Today
- 修改业务状态
- 驱动 Workflow

Today Runtime 可以展示 Timeline。

Today Runtime 不拥有 Timeline。

Today Runtime 不修改 Timeline。

---

## 13. Freeze Rules

保持与 Task 完全一致。

仅替换：

Task

↓

Timeline

---

## 14. V2 Reserved

未来可考虑：

- Timeline Category
- Timeline Tag
- Timeline Filter
- Timeline Replay
- Timeline Snapshot
- Cross-Matter Timeline

---

## 15. Freeze Conclusion

保持与 Task 完全一致。

仅替换：

Task

↓

Timeline
