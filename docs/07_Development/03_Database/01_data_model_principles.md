# NOTE: 本文件用于说明 Domain Model 与 Database Schema 的映射关系。Domain Model 本身的正式规范以 docs/03_Domain_Model 为准。
---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Domain Model Principles
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 01_domain_model_principles

## 1. Purpose

Domain Model Principles 定义 LawDesk V1 的统一业务对象模型。

Domain Model 描述：

- 系统有哪些业务对象
- 对象之间如何关联
- 对象承担什么职责
- 对象不承担什么职责

Domain Model 是 Workflow、Database、API 与 Frontend 的共同语言。

---

## 2. Core Principles

统一原则：

- Matter Centered
- Domain Driven
- Single Responsibility
- Stable Identity
- Explicit Relationships
- Workflow Independent
- Database Independent

Domain Model 描述业务对象，不描述业务流程。

---

## 3. Model Responsibilities

Domain Model 定义：

- Entity
- Attribute
- Identity
- Relationship
- Ownership
- Lifecycle Reference

Domain Model 不定义：

- Workflow
- Validation
- API
- Database Schema
- Runtime Behavior

---

## 4. Core Entities

LawDesk V1 核心业务对象包括：

- Matter
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

新增 Entity 属于 V2。

---

## 5. Relationships

所有业务对象围绕 Matter 建立关联。

Matter 是核心聚合根（Aggregate Root）。

其他对象通过明确关系与 Matter 关联。

---

## 6. Domain Model and Workflow

Workflow 决定对象状态流转。

Domain Model 定义对象本身。

Domain Model 不决定 Workflow。

---

## 7. Domain Model and Database

Database 根据 Domain Model 建立 Schema。

Domain Model 不定义数据库实现。

---


## 8. Domain Model Constraints

Domain Model：

不得：

- 定义业务规则
- 定义状态转换
- 定义 API
- 定义 Runtime

---

## 9. Freeze Rules

V1 Domain Model Principles 已冻结。

Core Entity 不得删除。

已发布 Entity 语义不得修改。

新增 Entity 属于 V2。

---

## 10. V2 Reserved

未来可考虑：

- Team
- Organization
- Court
- External Service
- Plugin Entity

---

## 11. Freeze Conclusion

该文档定义 LawDesk V1 Domain Model 官方规范。

Domain Model 是 Workflow、Database、API 与 Frontend 的统一业务对象模型。

本规范自 V1 起正式冻结。

Workflow、Database、API、AI Runtime、Frontend 及所有 V1 实现必须遵守本规范。

任何 Domain Model 修改必须进入 V2。
