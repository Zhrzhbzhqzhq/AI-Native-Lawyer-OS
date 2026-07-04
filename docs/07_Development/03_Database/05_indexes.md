---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Database Indexes
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 05_indexes

## 1. Index Principles

Index Strategy 必须服务于 V1 最小可用查询路径。

不得过度设计。

Database 是 Source of Truth。

Index 不定义业务规则。

Index 不改变 Ownership。

Index 不改变 Reference。

## 2. Schema Scope

本文件覆盖以下 11 张表：

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

## 3. Primary Key Index

所有表必须建立 Primary Key Index：

- matters.id
- clients.id
- materials.id
- evidence.id
- documents.id
- tasks.id
- timelines.id
- workflow_events.id
- ai_records.id
- knowledge.id
- workspaces.id

## 4. Domain Identity Unique Index

以下字段必须建立 Unique Index：

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

## 5. Matter Ownership Index

所有非 matters 表必须建立 matter_id 索引：

- clients.matter_id
- materials.matter_id
- evidence.matter_id
- documents.matter_id
- tasks.matter_id
- timelines.matter_id
- workflow_events.matter_id
- ai_records.matter_id
- knowledge.matter_id
- workspaces.matter_id

## 6. Status Index

所有表必须建立 status 索引：

- matters.status
- clients.status
- materials.status
- evidence.status
- documents.status
- tasks.status
- timelines.status
- workflow_events.status
- ai_records.status
- knowledge.status
- workspaces.status

## 7. Time Index

所有表必须建立 created_at、updated_at 索引：

- matters.created_at
- matters.updated_at
- clients.created_at
- clients.updated_at
- materials.created_at
- materials.updated_at
- evidence.created_at
- evidence.updated_at
- documents.created_at
- documents.updated_at
- tasks.created_at
- tasks.updated_at
- timelines.created_at
- timelines.updated_at
- workflow_events.created_at
- workflow_events.updated_at
- ai_records.created_at
- ai_records.updated_at
- knowledge.created_at
- knowledge.updated_at
- workspaces.created_at
- workspaces.updated_at

Event 类表额外时间索引：

- timelines.event_time
- workflow_events.event_time
- ai_records.created_at

## 8. Reference Index

根据 Table Relation 建立常用 Reference 索引：

- evidence.material_id
- documents.material_id
- documents.evidence_id
- tasks.client_id
- tasks.material_id
- tasks.evidence_id
- tasks.document_id
- timelines.task_id
- timelines.document_id
- timelines.material_id
- timelines.evidence_id
- timelines.ai_record_id
- workflow_events.timeline_id
- workflow_events.task_id
- workflow_events.document_id
- workflow_events.evidence_id
- workflow_events.ai_record_id
- ai_records.task_id
- ai_records.timeline_id
- ai_records.document_id
- ai_records.material_id
- ai_records.evidence_id
- ai_records.workflow_event_id
- ai_records.knowledge_id
- knowledge.document_id
- knowledge.material_id
- knowledge.evidence_id
- knowledge.task_id
- knowledge.timeline_id
- knowledge.workflow_event_id
- knowledge.ai_record_id
- workspaces.task_id
- workspaces.timeline_id
- workspaces.document_id
- workspaces.material_id
- workspaces.evidence_id
- workspaces.workflow_event_id
- workspaces.ai_record_id
- workspaces.knowledge_id

## 9. Recommended Composite Indexes

Matter 工作区常用查询：

- (matter_id, status)
- (matter_id, created_at)
- (matter_id, updated_at)

Task 查询：

- tasks(matter_id, status)
- tasks(matter_id, due_date)
- tasks(matter_id, priority)

Timeline 查询：

- timelines(matter_id, event_time)
- timelines(matter_id, event_type)

Workflow Event 查询：

- workflow_events(matter_id, event_time)
- workflow_events(matter_id, event_type)
- workflow_events(workflow_id, event_time)

AI Record 查询：

- ai_records(matter_id, ai_task_type)
- ai_records(matter_id, created_at)
- ai_records(model)

Knowledge 查询：

- knowledge(matter_id, category)
- knowledge(matter_id, updated_at)

Workspace 查询：

- workspaces(matter_id, status)

## 10. Constraints

Index Strategy 不得：

- 定义业务规则
- 定义 Workflow
- 定义 API
- 定义 Runtime
- 替代 Constraints
- 替代 Table Relations

## 11. Freeze Rules

V1 Index Strategy 已冻结。

新增索引属于 V2，除非用于性能修复。

删除索引必须进入 V2。

跨 Matter 查询索引属于 V2。

## 12. Freeze Conclusion

该文档定义 LawDesk V1 Index Strategy 官方规范。

Database 是 Source of Truth。

Index 不定义业务规则。

Index 不改变 Ownership。

Index 不改变 Reference。

本规范自 V1 起正式冻结。

... (remaining content same as original indexes.md)
