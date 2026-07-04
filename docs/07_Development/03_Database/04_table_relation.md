---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Table Relations
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 04_table_relation

## 1. Relation Principles

- matters 是中心表。
- Matter 是唯一 Aggregate Root。
- 所有非 matters 表通过 matter_id 归属 matters。
- Ownership 通过 matter_id 落库。
- Reference 不等于 Ownership。
- Cross-Matter Ownership 禁止。
- Database Schema 不定义业务规则。
- Database 是 Source of Truth。

## 2. Core Relation Map

matters

↓

clients

materials

evidence

documents

tasks

timelines

workflow_events

ai_records

knowledge

workspaces

所有子表均必须通过 matter_id 关联 matters。

## 3. Ownership Relations

| Child Table | Ownership FK | Ownership Rule |
|-------------|--------------|----------------|
| clients | matter_id | belongs to matters |
| materials | matter_id | belongs to matters |
| evidence | matter_id | belongs to matters |
| documents | matter_id | belongs to matters |
| tasks | matter_id | belongs to matters |
| timelines | matter_id | belongs to matters |
| workflow_events | matter_id | belongs to matters |
| ai_records | matter_id | belongs to matters |
| knowledge | matter_id | belongs to matters |
| workspaces | matter_id | belongs to matters |

统一规则：

- matter_id 是所有非 matters 表的核心归属外键。
- 任何 Reference 字段均不得改变 matter_id。
- V1 不支持 Cross-Matter Ownership。

## 4. Reference Relations

Evidence reference:

- evidence.material_id -> materials.material_id

Documents reference:

- material_id
- evidence_id

Tasks reference:

- client_id
- material_id
- evidence_id
- document_id

Timelines reference:

- task_id
- document_id
- material_id
- evidence_id
- ai_record_id

Workflow Events reference:

- workflow_id
- timeline_id
- task_id
- document_id
- evidence_id
- ai_record_id

AI Records reference:

- task_id
- timeline_id
- document_id
- material_id
- evidence_id
- workflow_event_id
- knowledge_id

Knowledge reference:

- document_id
- material_id
- evidence_id
- task_id
- timeline_id
- workflow_event_id
- ai_record_id

Workspaces reference:

- task_id
- timeline_id
- document_id
- material_id
- evidence_id
- workflow_event_id
- ai_record_id
- knowledge_id

## 5. Relationship Rules

每个 Reference 必须遵循：

- Reference does not equal Ownership.
- Reference must not change matter_id.
- Reference must stay within the same Matter.
- Cross-Matter Reference 属于 V2。
- V1 默认不支持跨 Matter Reference。
- Reference 可为空，除非 Schema 明确要求。

## 6. Event Object Relations

定义：

- timelines = Matter Business History
- workflow_events = Workflow Runtime Event
- ai_records = AI Runtime Work Record

允许：

- workflow_events -> timelines
- ai_records -> timelines

禁止：

- timelines -> workflow_events
- timelines -> ai_records

该关系与 Event Object Relationship 冻结规范保持一致。

## 7. Workspace Relations

- workspaces 是 Runtime Workspace 的持久化表。
- workspaces owns no Domain Object.
- workspaces 可引用其它表用于展示配置。
- workspaces 不改变任何对象 Ownership。

## 8. Delete and Archive Rules

- V1 不建议物理删除。
- 统一采用 status 控制逻辑删除、归档、关闭。
- Foreign key 应优先采用 restrictive 或 no cascade delete。
- 禁止默认 cascade delete 删除业务对象。

## 9. Constraints

本文件不定义：

- Workflow
- API
- Runtime
- 业务规则
- Domain Model 语义变更

## 10. Freeze Rules

Table Relation 自 V1 起冻结。

新增关系属于 V2。

跨 Matter 关系属于 V2。

删除既有关系必须进入 V2。

## 11. Freeze Conclusion

该文档定义 LawDesk V1 Table Relation 官方规范。

matters 是中心表，Matter 是唯一 Aggregate Root。

所有非 matters 表通过 matter_id 归属 matters。

Ownership 通过 matter_id 落库，Reference 不等于 Ownership。

Database Schema 不定义业务规则，Database 是 Source of Truth。

本规范自 V1 起正式冻结。

### timeline_tasks
- 左对象：Timelines
- 右对象：Tasks
- 关系含义：时间轴事件可以触发或关联多个 Tasks。
