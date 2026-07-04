---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Evidence
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 05_evidence

## 1. Purpose

Evidence 定义 LawDesk V1 的案件证据职责。

Evidence 是：

- Matter 的案件证据对象
- Domain Entity
- Matter 的组成部分

Evidence 不负责：

- Workflow
- API
- Database
- Runtime

---

## 2. Responsibilities

Evidence 负责：

- Evidence Identity
- Evidence Description
- Evidence Source Reference
- Evidence Relevance
- Evidence Classification
- Relationship to Matter
- Relationship to Material

Evidence 不负责：

- Workflow Execution
- Runtime Projection
- Database Persistence
- Evidence Legal Determination

---

## 3. Identity

Evidence 的 Identity 为：

- evidence_id

Identity：

- Immutable
- Unique
- Stable

Identity 一旦生成不得修改。

---

## 4. Aggregate Relationship

Evidence belongs to Matter.

Evidence is not an Aggregate Root.

---

## 5. Ownership

Ownership belongs to Matter.

Cross-Matter Ownership is prohibited.

---

## 6. Relationships

Evidence 可以引用：

- Matter
- Material
- Client
- Document
- Task
- Timeline
- AI Record
- Knowledge

Reference does not equal Ownership.

---

## 7. Lifecycle

Evidence Lifecycle：

Created

↓

Reviewed

↓

Used

↓

Archived

说明：

Matter Lifecycle 对 Evidence Lifecycle 具有约束作用。

Workflow 决定状态迁移。

---

## 8. Workflow Relationship

Workflow：

引用 Evidence。

Evidence：

不定义 Workflow。

---

## 9. Database Mapping

保持官方 Mapping：

Evidence

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

补充说明：

- API Resource 来源于 Evidence。
- API 不拥有 Evidence。
- API 不定义 Evidence。
- API 仅作为 Domain Model 的访问接口。

---

## 11. AI Relationship

AI 可以：

- Analyze
- Suggest
- Draft
- Review
- Summarize

AI 不拥有 Evidence。

AI 不修改 Evidence。

统一修改链：

Lawyer Confirms

↓

API Executes

↓

Database Updates

---

## 12. Constraints

Evidence：

不得：

- 定义 Workflow
- 定义 API
- 定义 Database
- 定义 Runtime
- 修改业务状态
- 自行决定证据法律效力

---

## 13. Freeze Rules

保持与 Material 完全一致。

---

## 14. V2 Reserved

例如：

- Evidence Chain
- Evidence Weight
- Evidence Authenticity Review
- Evidence Bundle
- Court Evidence Exchange

---

## 15. Freeze Conclusion

该文档定义 LawDesk V1 Evidence 官方规范。

Evidence 是 Matter 的 Domain Entity。

Evidence 不属于 Aggregate Root。

本规范自 V1 起正式冻结。

Workflow、Database、API、AI Runtime、Frontend 及所有 V1 实现必须遵守本规范。

任何 Evidence 修改必须进入 V2。
