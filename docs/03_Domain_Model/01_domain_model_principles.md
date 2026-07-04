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
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
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

## 2. Domain Model Principles

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

## 3. Domain Object Definition

Domain Model 定义：

- Entity
- Attribute
- Identity
- Relationship
- Ownership
- Lifecycle Reference

LawDesk V1 Domain Object 包括：

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

Domain Model 不定义：

- Workflow
- Validation
- API
- Database Schema
- Runtime Behavior

---

## 4. Aggregate Rules

Matter 是 LawDesk V1 唯一 Aggregate Root。

其他 Domain Object：

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

均属于 Matter。

Workspace 不是 Aggregate Root。

Workspace 属于 Runtime Workspace。

---

## 5. Identity Rules

每个 Domain Object 必须拥有 Immutable Identity。

Identity 一旦生成不得修改。

Identity 示例：

- Matter: matter_id
- Client: client_id
- Material: material_id
- Evidence: evidence_id
- Document: document_id
- Task: task_id
- Timeline: timeline_id
- Workflow Event: workflow_event_id
- AI Record: ai_record_id
- Knowledge: knowledge_id
- Workspace: workspace_id

---

## 6. Ownership Rules

Every Domain Object must belong to Matter.

Matter is the only Aggregate Root.

Cross-Aggregate Ownership is prohibited.

Ownership is immutable.

---

## 7. Reference Rules

Reference does not equal Ownership.

Domain Objects may reference other objects.

All references must ultimately trace back to Matter.

Reference relationships must not change Aggregate ownership.

---

## 8. Object Boundary

Domain Object：

不得：

- 修改其他 Domain Object
- 修改 Workflow
- 修改 Database
- 修改 Runtime

对象之间只能通过 Reference 建立关联。

Ownership ≠ Reference。

---

## 9. Event Object Boundary

Timeline、Workflow Event、AI Record 均属于 Event-like Domain Objects。

三者边界如下：

### Timeline

- records business history
- records what happened in the Matter
- is used for historical display and case review
- does not trigger Workflow
- does not execute Workflow
- does not record AI internal work by default

### Workflow Event

- records Workflow Runtime events
- records what happened inside Workflow execution
- may drive Timeline, Today Runtime, AI Runtime
- does not directly modify Domain Object
- does not replace Timeline

### AI Record

- records AI Runtime work
- records AI suggestions, drafts, analysis, reviews
- is used for auditability and review
- does not modify Domain Object
- does not replace Timeline
- does not replace Workflow Event

---

## 10. Domain Model and Workflow

Workflow 决定对象状态流转。

Domain Model 定义对象本身。

Domain Model 不决定 Workflow。

---

## 11. State Responsibility

Domain Model 定义：

- Identity
- Ownership
- Lifecycle

Workflow 定义：

- State Transition

API：

- Execute Changes

Database：

- Persist State

Today：

- Runtime Projection

补充：

- Domain Model 不负责状态迁移。
- Workflow 是唯一状态流转来源。

---

## 12. Lifecycle Rules

Matter 定义案件生命周期。

其他 Domain Object 允许拥有自己的生命周期。

但是所有对象生命周期必须受到 Matter Lifecycle 约束。

示例：

Matter Closed

↓

Task 不允许继续执行

↓

Evidence 不允许新增

↓

Document 不允许提交

---

## 13. AI Relationship

AI 与 Domain Object 的关系遵循以下原则：

AI 可以：

- Analyze
- Suggest
- Draft
- Summarize
- Review

AI 不拥有 Domain Object。

AI 不修改 Domain Object。

所有修改：

Lawyer Confirms

↓

API Executes

↓

Database Updates

---

## 14. Database Mapping

Database 根据 Domain Model 建立 Schema。

Domain Model 不定义数据库实现。

Database Schema 属于 Domain Model 的持久化实现。

映射链路：

Domain Model

↓

Database Schema

↓

API Resource

↓

Workflow Runtime

↓

Today Runtime

---

## 15. API Mapping

API Resource 来源于 Domain Object。

运行时链路：

Domain Model

↓

API Resource

↓

Workflow Runtime

↓

Today Runtime

---

## 16. Terminology

Entity：可独立识别的业务对象。

Aggregate Root：聚合入口对象，用于承载同一业务边界内的对象治理。

Ownership：对象归属关系。

Reference：对象之间的引用关系。

Identity：对象不可变标识。

Lifecycle：对象从创建到结束的状态演化过程。

Runtime：运行时生成和展示业务视图的执行层。

Runtime Projection：运行时投影视图。

Workspace：案件工作区，用于组织案件工作的运行时空间。

---

## 17. Constraints

Domain Model：

不得：

- 定义业务规则
- 定义状态转换
- 定义 API
- 定义 Runtime
- 定义 Workflow
- 定义 Database Schema
- 定义 Runtime Behavior
- 修改业务状态

---

## 18. Freeze Rules

V1 Domain Model Principles 已冻结。

Core Entity 不得删除。

已发布 Entity 语义不得修改。

Entity registration order must remain stable.

Matter remains the only Aggregate Root.

Published Entity semantics must remain unchanged.

新增 Entity 属于 V2。

---

## 19. V2 Reserved

未来可考虑：

- Team
- Organization
- Court
- External Service
- Plugin Entity

---

## 20. Freeze Conclusion

该文档定义 LawDesk V1 Domain Model 官方规范。

Domain Model 是 Workflow、Database、API 与 Frontend 的统一业务对象模型。

本规范自 V1 起正式冻结。

Workflow、Database、API、AI Runtime、Frontend 及所有 V1 实现必须遵守本规范。

任何 Domain Model 修改必须进入 V2。
