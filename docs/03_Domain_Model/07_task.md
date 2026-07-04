---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Task
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 07_task

## 1. Purpose

Task 定义 LawDesk 的办案任务对象（Task）。

Task 用于表示律师在案件办理过程中需要完成的具体工作。

例如：

- 法律检索
- 起草起诉状
- 补充证据
- 联系客户
- 庭审准备
- 提交材料
- 执行申请
- 结案复盘

Task 属于 Domain Object。

Task 不是 Workflow。

Task 不是 Runtime。

Task 不是 Today。

---

## 2. Responsibilities

Task 负责：

- Task Identity
- Task Title
- Task Description
- Task Priority
- Task Status
- Due Date
- Related Matter
- Related Client
- Related Material
- Related Evidence
- Related Document

Task 不负责：

- Workflow
- Runtime
- Today Generation
- State Transition
- Validation

---

## 3. Identity

Identity：

- task_id

Identity Immutable.

---

## 4. Aggregate Relationship

Task belongs to Matter.

Task is not an Aggregate Root.

Matter is the only Aggregate Root.

---

## 5. Ownership

Ownership belongs to Matter.

Cross-Matter Ownership is prohibited.

---

## 6. Relationships

Task 可以引用：

- Matter
- Client
- Material
- Evidence
- Document
- Timeline
- AI Record
- Knowledge

Reference does not equal Ownership.

---

## 7. Lifecycle

Task Lifecycle：

Created

↓

Planned

↓

In Progress

↓

Completed

↓

Archived

Matter Lifecycle 对 Task Lifecycle 生效。

Workflow 决定状态迁移。

---

## 8. Workflow Relationship

Workflow 可以：

- Create Task
- Update Task
- Complete Task

Workflow 不拥有 Task。

Workflow 不定义 Task。

Workflow 不属于 Task。

---

## 9. Database Mapping

保持官方唯一 Mapping：

Task

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

API 不拥有 Task。

API 不定义 Task。

---

## 11. AI Relationship

AI 可以：

- Analyze
- Suggest
- Draft
- Review
- Summarize

AI 不可以：

- Modify Task
- Complete Task
- Change Task Lifecycle

统一执行链：

Lawyer Confirms

↓

API Executes

↓

Database Updates

---

## 12. Constraints

Task 不得：

- 定义 Workflow
- 定义 API
- 定义 Database
- 定义 Runtime
- 定义 Today
- 修改业务状态

Today Runtime 可以展示 Task。

Today Runtime 不拥有 Task。

Today Runtime 不修改 Task。

---

## 13. Freeze Rules

保持与 Document 完全一致。

仅替换：

Document

↓

Task

---

## 14. V2 Reserved

未来可考虑：

- Task Dependency
- Task Template
- Task Checklist
- Recurring Task
- Collaborative Task
- Task Automation

---

## 15. Freeze Conclusion

保持与 Document 完全一致。

仅替换：

Document

↓

Task
