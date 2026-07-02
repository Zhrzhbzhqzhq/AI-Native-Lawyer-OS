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
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 03_indexes

## 1. Index Principles

- 采用 PostgreSQL 索引设计。
- V1 只建立高频查询索引，避免为所有字段建索引。
- 外键字段应建立普通索引，支持关联查询。
- 编号字段应建立唯一索引，保证业务对象唯一性。
- 关系表应建立唯一组合索引，防止重复关系。
- Today 查询相关字段优先。

## 2. Unique Indexes

建议唯一索引：

- `matters.matter_no`
- `clients.client_no`
- `materials.material_no`
- `evidence.evidence_no`
- `documents.document_no`
- `timelines.timeline_no`
- `tasks.task_no`
- `research.research_no`
- `knowledge.knowledge_no`
- `ai_work_records.ai_work_no`
- `matter_workspaces.workspace_no`
- `matter_workspaces.matter_id`

说明：

- `matter_workspaces.matter_id` 应保持唯一，用于保证一个 Matter 只有一个 Workspace。
- 编号字段唯一索引可支持快速查找和业务对象去重。

## 3. Foreign Key Indexes

为以下外键字段设计普通索引：

- `materials.matter_id`
- `evidence.matter_id`
- `evidence.primary_material_id`
- `documents.matter_id`
- `timelines.matter_id`
- `tasks.matter_id`
- `research.matter_id`
- `knowledge.matter_id`
- `knowledge.source_matter_id`
- `ai_work_records.matter_id`
- `matter_workspaces.matter_id`

关系表索引：

- `matter_clients.matter_id`
- `matter_clients.client_id`
- `material_evidence.material_id`
- `material_evidence.evidence_id`
- `document_evidence.document_id`
- `document_evidence.evidence_id`
- `document_research.document_id`
- `document_research.research_id`
- `timeline_documents.timeline_id`
- `timeline_documents.document_id`
- `timeline_evidence.timeline_id`
- `timeline_evidence.evidence_id`
- `timeline_tasks.timeline_id`
- `timeline_tasks.task_id`

说明：

- 外键索引支持关联查询和删除时的查找效率。
- 关系表索引支持多对多关系检索。

## 4. Matter Query Indexes

支持案件列表和案件管理的索引：

- `matters.status`
- `matters.stage`
- `matters.priority`
- `matters.risk_level`
- `matters.next_deadline`
- `matters.updated_at`
- `matters.created_at`
- `matters.primary_client_id`

建议组合索引：

- `matters(status, updated_at)`
- `matters(stage, updated_at)`
- `matters(risk_level, next_deadline)`

说明：

- 查询案件列表时常按状态和更新时间筛选。
- 按优先级、风险等级和关键期限排序时也应有支持。

## 5. Today Dashboard Indexes

支持 Today 工作台的索引：

- `tasks.status`
- `tasks.priority`
- `tasks.due_at`
- `tasks.generated_by`
- `timelines.event_time`
- `timelines.status`
- `matter_workspaces.last_active_at`
- `matter_workspaces.status`

建议组合索引：

- `tasks(status, due_at)`
- `tasks(priority, due_at)`
- `tasks(matter_id, status)`
- `timelines(matter_id, event_time)`
- `matter_workspaces(status, last_active_at)`

说明：

- Today 视图需要快速定位待办任务、到期任务和最新时间轴事件。
- Matter_Workspace 的活跃状态查询应优先。

## 6. AI Work Record Indexes

支持 AI 工作记录查询的索引：

- `ai_work_records.matter_id`
- `ai_work_records.work_category`
- `ai_work_records.status`
- `ai_work_records.source_object`
- `ai_work_records.source_object_id`
- `ai_work_records.created_at`

建议组合索引：

- `ai_work_records(matter_id, created_at)`
- `ai_work_records(matter_id, work_category)`
- `ai_work_records(source_object, source_object_id)`

说明：

- AI 工作记录常按 Matter 查询，并按时间、类别过滤。
- `source_object` 与 `source_object_id` 支持跨对象来源追踪。

## 7. Relation Table Unique Constraints

建议关系表组合唯一：

- `matter_clients(matter_id, client_id, role)`
- `material_evidence(material_id, evidence_id)`
- `document_evidence(document_id, evidence_id)`
- `document_research(document_id, research_id)`
- `timeline_documents(timeline_id, document_id)`
- `timeline_evidence(timeline_id, evidence_id)`
- `timeline_tasks(timeline_id, task_id)`

说明：

- 这些唯一约束避免重复关系。
- `matter_clients` 允许同一客户在不同 Matter 中扮演不同 role，但同一关系组合不得重复。

## 8. V2 Reserved

V2 可考虑的索引类型：

- 全文搜索索引
- 向量索引
- GIN 索引
- JSONB 深度索引
- 多租户索引
- 权限索引
- 审计日志索引

说明：

- V1 避免过度设计，不在当前阶段引入这些索引。

## 9. Freeze Conclusion

该索引设计可支持 LawDesk V1 的 Database、API、Today、AI Runtime 和 Workspace 查询。

- 以高频查询为主，避免为低频字段建立索引。
- 兼顾案件列表、Today 工作台、Matter_Workspace、AI 工作查询和关系检索。
- 关系表唯一组合索引防止重复多对多关联。
