---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Matter
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 02_matter

## 1. Purpose

Matter 定义 LawDesk V1 的核心职责。

Matter 是：

- 唯一 Aggregate Root
- 唯一案件对象
- Workflow 的核心对象
- Domain Model 的核心对象

Matter 也是整个 Domain Model 的 Golden Template。

后续所有 Domain Object 均按照 Matter 的章节结构编写。

Matter 不负责：

- Workflow
- API
- Database
- Runtime

---

## 2. Responsibilities

Matter 负责：

- Case Identity
- Ownership
- Lifecycle
- Relationships

Matter 不负责：

- Workflow Execution
- Runtime Projection
- Database Persistence

---

## 3. Identity

Matter 的 Identity 为：

- matter_id

Identity：

- Immutable
- Unique
- Stable

Identity 一旦生成不得修改。

---

## 4. Aggregate Root

Matter 是 LawDesk V1 唯一 Aggregate Root。

以下对象属于 Matter：

- Client
- Material
- Evidence
- Document
- Task
- Timeline
- Workflow Event
- AI Record
- Knowledge
- Workspace

Workspace belongs to Matter.

Workspace is a Runtime Workspace.

Workspace is not an Aggregate Root.

Workspace does not own any Domain Object.

Matter 管理 Aggregate Boundary。

---

## 5. Ownership

Matter 拥有：

- Clients
- Materials
- Evidence
- Documents
- Tasks
- Timeline
- Workflow Events
- AI Records
- Knowledge
- Workspace

Ownership：

不得跨 Matter。

---

## 6. Relationships

Matter

↓

Client

↓

Material

↓

Evidence

↓

Document

↓

Task

↓

Timeline

↓

Workflow Event

↓

AI Record

↓

Knowledge

↓

Workspace

Reference：

允许。

Ownership：

唯一。

---

## 7. Lifecycle

Matter Lifecycle：

Created

↓

Active

↓

Closed

↓

Archived

说明：

Workflow 决定状态迁移。

Matter 定义生命周期。

---

## 8. Workflow Relationship

Workflow：

引用 Matter。

Matter：

不定义 Workflow。

---

## 9. Database Mapping

统一：

Matter

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

API Relationship 引用第 9 节官方 Mapping。

API Resource 来源于 Matter。

API 不拥有 Matter。

API 不定义 Matter。

API 仅作为 Domain Model 的访问接口。

---

## 11. AI Relationship

AI 可以：

- Analyze
- Suggest
- Draft
- Review

AI 不可以：

- Modify Matter
- Change Lifecycle
- Change Ownership

所有修改：

Lawyer Confirms

↓

API Executes

↓

Database Updates

---

## 12. Constraints

Matter：

不得：

- 定义 Workflow
- 定义 API
- 定义 Database
- 修改 Runtime

---

## 13. Freeze Rules

Matter 为：

唯一 Aggregate Root。

Matter Identity：

不得修改。

Matter Ownership：

不得修改。

Matter Lifecycle：

V1 冻结。

---

## 14. V2 Reserved

例如：

- Matter Template
- Matter Category
- Matter Collaboration
- Multi-Workspace Matter

---

## 15. Freeze Conclusion

该文档定义 LawDesk V1 Matter 官方规范。

Matter 是：

LawDesk V1 唯一 Aggregate Root。

Matter 是整个 Domain Model 的核心对象。

本规范自 V1 起正式冻结。

Workflow、Database、API、AI Runtime、Frontend 及所有 V1 实现必须遵守本规范。

任何 Matter 修改必须进入 V2。
