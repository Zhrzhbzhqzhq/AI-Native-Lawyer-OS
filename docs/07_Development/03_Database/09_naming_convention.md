---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Naming Convention
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 09_naming_convention

## 1. Naming Principles

- Naming Convention 用于统一数据库对象命名。
- Naming Convention 不定义业务规则。
- Naming Convention 不修改 Domain Model。
- Naming Convention 不修改 Schema 语义。
- Database 是 Source of Truth。

所有命名必须：

- lowercase
- snake_case
- readable
- stable
- deterministic

禁止：

- camelCase
- PascalCase
- 空格
- 中文命名
- 缩写不一致
- 同义词混用

## 2. Table Naming

- 表名统一：复数小写 snake_case。

V1 官方表名：

- matters
- clients
- materials
- evidence
- documents
- tasks
- timelines
- workflow_events
- ai_records
- knowledge
- workspaces

说明：

- evidence 和 knowledge 作为集合名，V1 保持不加 s。

不得使用：

- matter
- client
- material
- document
- task
- timeline
- workflowEvent
- aiRecord
- workspace

## 3. Primary Key Naming

所有表主键统一：

- id

说明：

- id 是数据库内部主键。
- id 不等于 Domain Identity。

## 4. Domain Identity Naming

Domain Identity 统一：

<object>_id

V1 官方 Domain Identity：

- matter_id
- client_id
- material_id
- evidence_id
- document_id
- task_id
- timeline_id
- workflow_event_id
- ai_record_id
- knowledge_id
- workspace_id

Domain Identity 不得修改。

Domain Identity 不得复用。

## 5. Foreign Key Naming

外键统一：

<referenced_object>_id

例如：

- matter_id
- client_id
- material_id
- evidence_id
- document_id
- task_id
- timeline_id
- workflow_event_id
- ai_record_id
- knowledge_id
- workspace_id

Ownership 外键：

- matter_id

Reference 外键：

- xxx_id

Reference 不等于 Ownership。

## 6. Timestamp Naming

时间字段统一：

- created_at
- updated_at
- closed_at
- archived_at
- event_time
- due_date

禁止：

- createTime
- updatedTime
- createdDate
- update_date

## 7. Status Naming

状态字段统一：

- status

不得使用：

- state
- lifecycle
- phase

说明：

- status 表示数据库层受控状态字段。
- status 语义来源于 Domain Model / Workflow。
- Database 不定义业务流程。

## 8. Index Naming

索引命名统一：

- idx_<table>_<field>

组合索引：

- idx_<table>_<field1>_<field2>

示例：

- idx_tasks_matter_id
- idx_tasks_matter_id_status
- idx_timelines_matter_id_event_time
- idx_workflow_events_workflow_id_event_time
- idx_ai_records_matter_id_created_at

Unique Index：

- uq_<table>_<field>

示例：

- uq_matters_matter_id
- uq_clients_client_id
- uq_tasks_task_id

## 9. Constraint Naming

约束命名统一：

Primary Key：

- pk_<table>

Foreign Key：

- fk_<table>_<field>

Check：

- ck_<table>_<field>

Unique：

- uq_<table>_<field>

示例：

- pk_matters
- fk_clients_matter_id
- fk_evidence_material_id
- ck_matters_status
- uq_documents_document_id

## 10. Migration File Naming

Migration 文件命名统一：

YYYYMMDDHHMMSS_<action>_<target>.sql

action 允许：

- create
- alter
- add
- remove
- fix

target 使用表名、字段名或约束名。

示例：

- 20260701000100_create_matters.sql
- 20260701000200_create_clients.sql
- 20260701002000_add_fk_clients_matter_id.sql
- 20260701003000_add_idx_tasks_matter_id_status.sql

## 11. Seed File Naming

Seed 文件命名统一：

seed_v<version>.sql

示例：

- seed_v1.sql
- seed_v1_1.sql
- seed_v2.sql

Seed 文件不得覆盖历史含义。

## 12. JSON / Config Field Naming

JSON 字段统一 snake_case。

例如：

- view_config
- contact_info
- prompt_uri
- result_uri

JSON 内部 key 也应使用 snake_case。

## 13. Reserved Naming Rules

禁止使用数据库保留字作为字段名。

禁止使用模糊字段名：

- data
- info
- value
- object
- item

除非已在 Schema 中冻结，例如：

- contact_info
- view_config

## 14. Freeze Rules

V1 Naming Convention 已冻结。

表名不得修改。

Domain Identity 命名不得修改。

主键命名不得修改。

新增命名规则属于 V2。

删除命名规则必须进入 V2。

## 15. Freeze Conclusion

该文档定义 LawDesk V1 Database Naming Convention 官方规范。

所有命名必须 lowercase、snake_case、readable、stable、deterministic。

Naming Convention 不定义业务规则，不修改 Domain Model，不修改 Schema 语义。

本规范自 V1 起正式冻结。
