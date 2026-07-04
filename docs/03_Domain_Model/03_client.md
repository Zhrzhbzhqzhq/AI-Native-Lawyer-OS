---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Client
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 03_client

## 1. Purpose

Client 定义 LawDesk V1 的客户职责。

Client 是：

- Matter 的客户对象
- Domain Entity
- Matter 的组成部分

Client 不负责：

- Workflow
- API
- Database
- Runtime

---

## 2. Responsibilities

Client 负责：

- Client Identity
- Client Information
- Contact Information
- Relationship to Matter

Client 不负责：

- Workflow Execution
- Runtime Projection
- Database Persistence

---

## 3. Identity

Client 的 Identity 为：

- client_id

Identity：

- Immutable
- Unique
- Stable

Identity 一旦生成不得修改。

---

## 4. Aggregate Relationship

Client belongs to Matter.

Client is not an Aggregate Root.

Ownership belongs to Matter.

Cross-Matter Ownership is prohibited.

---

## 5. Ownership

Client 由 Matter 拥有。

Ownership：

唯一。

不得跨 Matter。

---

## 6. Relationships

Client 可关联：

- Matter
- Material
- Evidence
- Document
- Task

Relationship：

Reference Only.

Ownership 不改变。

---

## 7. Lifecycle

Client 生命周期：

Created

↓

Active

↓

Archived

说明：

Matter Lifecycle 对 Client Lifecycle 具有约束作用。

---

## 8. Workflow Relationship

Workflow：

引用 Client。

Client：

不定义 Workflow。

---

## 9. Database Mapping

统一采用官方 Mapping：

Client

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

引用第 9 节官方 Mapping。

补充说明：

- API Resource 来源于 Client。
- API 不拥有 Client。
- API 不定义 Client。
- API 仅作为 Domain Model 的访问接口。

---

## 11. AI Relationship

AI 可以：

- Analyze
- Suggest
- Draft
- Review

AI 不可以：

- Modify Client
- Change Ownership
- Change Lifecycle

所有修改：

Lawyer Confirms

↓

API Executes

↓

Database Updates

---

## 12. Constraints

Client：

不得：

- 定义 Workflow
- 定义 API
- 定义 Database
- 定义 Runtime
- 修改业务状态

---

## 13. Freeze Rules

Client Identity：

不得修改。

Client Ownership：

不得修改。

Client Lifecycle：

V1 冻结。

---

## 14. V2 Reserved

例如：

- Multiple Contacts
- Client Organization
- External Client Sync
- Client Profile Extension

---

## 15. Freeze Conclusion

该文档定义 LawDesk V1 Client 官方规范。

Client 是 Matter 的 Domain Entity。

Client 不属于 Aggregate Root。

本规范自 V1 起正式冻结。

Workflow、Database、API、AI Runtime、Frontend 及所有 V1 实现必须遵守本规范。

任何 Client 修改必须进入 V2。
