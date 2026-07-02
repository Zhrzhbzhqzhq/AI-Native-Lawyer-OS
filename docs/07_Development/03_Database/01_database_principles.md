---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Database Principles
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 01_database_principles

## 1. Purpose

Database Principles 定义 LawDesk Database 的统一设计原则。

Database 是业务数据的唯一持久化层（Persistent Storage）。

Database 保存 Workflow 执行后的最终业务状态。

Database 不负责业务决策。

---

## 2. Core Principles

统一原则：

- Workflow Driven
- Matter Centered
- Source of Truth
- Persistent Storage
- API Writes
- Runtime Reads
- Immutable History

Workflow 决定业务状态。

API 更新 Database。

Runtime 读取 Database。

---

## 3. Database Responsibilities

Database 负责：

- 保存 Matter
- 保存 Client
- 保存 Task
- 保存 Timeline
- 保存 Workflow Event
- 保存 AI Records
- 保存业务状态

Database 不负责：

- Workflow 判断
- 状态流转
- Validation
- AI 决策
- Today Generation

---

## 4. Source of Truth

Database 是 LawDesk 唯一业务数据来源（Source of Truth）。

任何 Runtime：

- Today
- Dashboard
- Timeline
- AI Workspace

均不得作为业务状态来源。

所有 Runtime 均可重新生成。

---

## 5. Database and Workflow

Workflow 决定：

- 状态是否合法
- 是否允许修改

Database：

仅保存 Workflow 执行后的结果。

不得绕过 Workflow 修改数据。

---

## 6. Database and API

API 是 Database 的唯一写入口。

所有业务数据更新：

Workflow

↓

Validation

↓

API

↓

Database

↓

Workflow Event

↓

Runtime

Database 不直接暴露写接口。

---

## 7. Database and Runtime

Runtime 可以读取：

- Matter
- Workflow
- Tasks
- Timeline
- Workflow Events
- AI Records

Runtime 不修改 Database。

---

## 8. Database Constraints

Database：

不得：

- 决定业务规则
- 修改 Workflow
- 修改 Lifecycle
- 自动生成 Today
- 自动执行 AI

Database 始终保存最终业务状态。

---

## 9. Freeze Rules

V1 Database Principles 已冻结。

Database Principles 不得修改。

Source of Truth 定义不得修改。

新增 Database Principle 属于 V2。

---

## 10. V2 Reserved

未来可考虑：

- Event Store
- CQRS
- Read Replica
- Distributed Database
- Multi-Tenant
- Data Lake

---

## 11. Freeze Conclusion

该文档定义 LawDesk V1 Database 官方设计原则。

Database 是 LawDesk 唯一业务数据来源（Source of Truth）。

本规范自 V1 起正式冻结。

Database、API、Workflow、AI Runtime、Frontend 及所有 V1 实现必须遵守本规范。

任何 Database Principle 修改必须进入 V2。
