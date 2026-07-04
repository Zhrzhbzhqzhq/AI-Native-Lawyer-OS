---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Database Constraints
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 06_constraints

## 1. Constraint Principles

- Database Constraints 用于保护数据完整性。
- Database Constraints 不定义业务规则。
- Database 是 Source of Truth。
- Matter 是唯一 Aggregate Root。
- Ownership 通过 matter_id 约束。
- Reference 不等于 Ownership。
- V1 禁止 Cross-Matter Ownership。
- V1 默认不支持 Cross-Matter Reference。
- V1 禁止默认 cascade delete。

## 2. Constraint Types

### 2.1 NOT NULL Constraints

所有表必须约束：

- id
- Domain Identity 字段
- status
- created_at
- updated_at

所有非 matters 表必须约束：

- matter_id

### 2.2 UNIQUE Constraints

Domain Identity 必须唯一：

- matters.matter_id
- clients.client_id
- materials.material_id
- evidence.evidence_id
- documents.document_id
- tasks.task_id
- timelines.timeline_id
- workflow_events.workflow_event_id
- ai_records.ai_record_id
- knowledge.knowledge_id
- workspaces.workspace_id

### 2.3 FOREIGN KEY Constraints

所有非 matters 表必须满足：

- matter_id -> matters.matter_id

Reference 外键按 Table Relation 定义。

### 2.4 CHECK Constraints

- status 必须受控。
- created_at <= updated_at。
- closed_at / archived_at 不得早于 created_at。

### 2.5 Ownership Constraints

非 matters 表：

- matter_id 不得为空。
- matter_id 不得被业务更新改变 Ownership。
- Cross-Matter Ownership 禁止。

### 2.6 Reference Constraints

- Reference does not equal Ownership.
- Reference 不得改变 matter_id。
- Reference 默认必须在同一 Matter 内。
- Cross-Matter Reference 属于 V2。

### 2.7 Delete / Archive Constraints

- V1 不建议物理删除。
- 统一通过 status 控制：active / archived / deleted。
- 禁止默认 cascade delete。
- Foreign Key 默认采用 restrict 或 no action。
- 不得使用默认 cascade delete 删除业务对象。

## 3. Status Constraints

status 字段是数据库层受控字段。

各对象允许拥有自己的 status 枚举。

status 枚举必须由 Domain Model / Workflow 定义。

Database 只负责约束允许值。

不得由 Database 定义业务流程。

至少覆盖：

- matters.status

对应 Matter Lifecycle：

- consultation
- accepted
- active
- closing
- closed
- archived

其他对象 status 应与各自 Domain Model Lifecycle 一致。

## 4. Table-Level Constraints

### matters

- matter_id unique
- status check
- closed_at / archived_at check

### clients

- client_id unique
- matter_id foreign key
- status check

### materials

- material_id unique
- matter_id foreign key
- status check

### evidence

- evidence_id unique
- matter_id foreign key
- material_id reference foreign key
- status check

### documents

- document_id unique
- matter_id foreign key
- material_id reference foreign key optional
- evidence_id reference foreign key optional
- status check

### tasks

- task_id unique
- matter_id foreign key
- reference fields optional
- due_date optional
- status check

### timelines

- timeline_id unique
- matter_id foreign key
- event_time not null
- reference fields optional
- status check

### workflow_events

- workflow_event_id unique
- matter_id foreign key
- workflow_id required
- event_time not null
- payload optional JSON
- status check

### ai_records

- ai_record_id unique
- matter_id foreign key
- ai_task_type required
- model optional
- prompt_uri optional
- result_uri optional
- status check

### knowledge

- knowledge_id unique
- matter_id foreign key
- category optional
- version optional
- status check

### workspaces

- workspace_id unique
- matter_id foreign key
- view_config optional JSON
- preferences optional JSON
- status check
- Workspace owns no Domain Object

## 5. Reference Foreign Key Matrix

以下 Reference 外键用于关系一致性约束：

- evidence.material_id -> materials.material_id
- documents.material_id -> materials.material_id (optional)
- documents.evidence_id -> evidence.evidence_id (optional)
- tasks.client_id -> clients.client_id (optional)
- tasks.material_id -> materials.material_id (optional)
- tasks.evidence_id -> evidence.evidence_id (optional)
- tasks.document_id -> documents.document_id (optional)
- timelines.task_id -> tasks.task_id (optional)
- timelines.document_id -> documents.document_id (optional)
- timelines.material_id -> materials.material_id (optional)
- timelines.evidence_id -> evidence.evidence_id (optional)
- timelines.ai_record_id -> ai_records.ai_record_id (optional)
- workflow_events.timeline_id -> timelines.timeline_id (optional)
- workflow_events.task_id -> tasks.task_id (optional)
- workflow_events.document_id -> documents.document_id (optional)
- workflow_events.evidence_id -> evidence.evidence_id (optional)
- workflow_events.ai_record_id -> ai_records.ai_record_id (optional)
- ai_records.task_id -> tasks.task_id (optional)
- ai_records.timeline_id -> timelines.timeline_id (optional)
- ai_records.document_id -> documents.document_id (optional)
- ai_records.material_id -> materials.material_id (optional)
- ai_records.evidence_id -> evidence.evidence_id (optional)
- ai_records.workflow_event_id -> workflow_events.workflow_event_id (optional)
- ai_records.knowledge_id -> knowledge.knowledge_id (optional)
- knowledge.document_id -> documents.document_id (optional)
- knowledge.material_id -> materials.material_id (optional)
- knowledge.evidence_id -> evidence.evidence_id (optional)
- knowledge.task_id -> tasks.task_id (optional)
- knowledge.timeline_id -> timelines.timeline_id (optional)
- knowledge.workflow_event_id -> workflow_events.workflow_event_id (optional)
- knowledge.ai_record_id -> ai_records.ai_record_id (optional)
- workspaces.task_id -> tasks.task_id (optional)
- workspaces.timeline_id -> timelines.timeline_id (optional)
- workspaces.document_id -> documents.document_id (optional)
- workspaces.material_id -> materials.material_id (optional)
- workspaces.evidence_id -> evidence.evidence_id (optional)
- workspaces.workflow_event_id -> workflow_events.workflow_event_id (optional)
- workspaces.ai_record_id -> ai_records.ai_record_id (optional)
- workspaces.knowledge_id -> knowledge.knowledge_id (optional)

## 6. Ownership and Cross-Matter Rules

- 所有非 matters 表必须通过 matter_id 归属 matters。
- Reference 外键不改变 Ownership。
- V1 禁止 Cross-Matter Ownership。
- V1 默认不支持 Cross-Matter Reference。
- Cross-Matter Constraint 属于 V2。

## 7. Delete / Archive Rules

- V1 不建议物理删除。
- 统一通过 status 控制逻辑删除、归档、关闭。
- Foreign key 默认 restrict 或 no action。
- 禁止默认 cascade delete 删除业务对象。

## 8. Constraints Boundary

Constraints 不得：

- 定义 Workflow
- 定义 API
- 定义 Runtime
- 定义业务规则
- 改变 Ownership
- 改变 Reference
- 允许默认 cascade delete

## 9. Freeze Rules

V1 Database Constraints 已冻结。

新增约束属于 V2，除非用于数据完整性修复。

删除约束必须进入 V2。

Cross-Matter Constraint 属于 V2。

## 10. Freeze Conclusion

该文档定义 LawDesk V1 Database Constraints 官方规范。

Database Constraints 用于保护数据完整性。

Database Constraints 不定义业务规则。

Database 是 Source of Truth。

Matter 是唯一 Aggregate Root。

Ownership 通过 matter_id 约束，Reference 不等于 Ownership。

本规范自 V1 起正式冻结。
