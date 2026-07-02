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
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 02_table_relation

## 1. Relation Principles

- Matter 是 LawDesk 的核心业务对象，所有业务实体都归属于 Matter。
- Matter_Workspace 是聚合根入口，负责组织 Matter 的当前工作区和 Today 视图。
- 业务对象通过 `matter_id` 直接归属到 Matter，避免将 `workspace_id` 嵌入 `matters` 表，防止循环引用。
- 复杂业务关系通过关系表表达，多对多关系不直接写入核心业务表。
- `AI_Work_Records` 仅记录 AI 工作过程和结果，不作为业务真相来源。
- V1 不做多租户、团队权限、复杂版本管理，避免提前引入 `users`、`teams`、`permissions` 等新 Domain Model。

## 2. Core Relation Map

Matter
├── Matter_Workspace
├── Clients
├── Materials
├── Evidence
├── Documents
├── Timelines
├── Tasks
├── Research
├── Knowledge
└── AI_Work_Records

## 3. One-to-One Relations

- Matter → Matter_Workspace
  - 原则上一个 Matter 对应一个 Matter_Workspace。
  - 由 `matter_workspaces.matter_id` 表达归属关系。
  - `matters` 不反向保存 `workspace_id`，避免循环引用。
  - 该设计支持 Matter 作为业务根，Matter_Workspace 作为当前工作区入口。

## 4. One-to-Many Relations

- Matter → Materials
  - `materials.matter_id` 归属于 Matter。
  - 表示案件资料属于某个 Matter。

- Matter → Evidence
  - `evidence.matter_id` 归属于 Matter。
  - 表示证据属于某个 Matter。

- Matter → Documents
  - `documents.matter_id` 归属于 Matter。
  - 表示文书属于某个 Matter。

- Matter → Timelines
  - `timelines.matter_id` 归属于 Matter。
  - 表示时间轴事件属于某个 Matter。

- Matter → Tasks
  - `tasks.matter_id` 归属于 Matter。
  - 表示任务属于某个 Matter。

- Matter → Research
  - `research.matter_id` 归属于 Matter。
  - 表示法律检索或分析记录属于某个 Matter。

- Matter → AI_Work_Records
  - `ai_work_records.matter_id` 归属于 Matter。
  - 表示 AI 工作记录属于某个 Matter，但并非业务真相。

- Matter → Knowledge
  - `knowledge.matter_id` 归属于 Matter。
  - 表示知识条目与某个 Matter 关联。

## 5. Many-to-Many Relations

### matter_clients
- 左对象：Matter
- 右对象：Clients
- 关系含义：多个 Matter 可关联多个客户，客户可能在不同 Matter 中扮演不同角色。
- `role` 用于说明客户在该 Matter 中的角色，而不是代替主客户。

### material_evidence
- 左对象：Materials
- 右对象：Evidence
- 关系含义：一个 Material 可以支持多个 Evidence，一个 Evidence 也可以来源于多个 Material。
- `relationship_type` 用于说明 Material 与 Evidence 之间的关联类型，如 supports 等。

### document_evidence
- 左对象：Documents
- 右对象：Evidence
- 关系含义：一个 Document 可以引用或关联多条 Evidence，一个 Evidence 可以被多个 Document 使用。
- `relationship_type` 用于说明 Document 与 Evidence 的关联方式。

### document_research
- 左对象：Documents
- 右对象：Research
- 关系含义：Document 可能基于多个 Research 结果生成或引用，Research 也可能服务于多个 Document。
- `relationship_type` 用于说明 Document 与 Research 的关联语义。

### timeline_documents
- 左对象：Timelines
- 右对象：Documents
- 关系含义：时间轴事件可以与多个 Document 关联，用于补充 `timelines.related_document_id` 的简单关联。
- `relationship_type` 用于说明 Timeline 与 Document 的具体关联。

### timeline_evidence
- 左对象：Timelines
- 右对象：Evidence
- 关系含义：时间轴事件可以与多个 Evidence 关联，用于补充 `timelines.related_evidence_id` 的简单关联。
- `relationship_type` 用于说明 Timeline 与 Evidence 的具体关联。

### timeline_tasks
- 左对象：Timelines
- 右对象：Tasks
- 关系含义：时间轴事件可以关联多个 Task，用于补充 `timelines.related_task_id` 的简单关联。
- `relationship_type` 可用于说明事件与任务之间的具体关系。

## 6. Important Relation Rules

- `primary_client_id` 是 Matter 的快速读取字段，用于标记主要客户。
- `matter_clients` 才是完整的客户关系表，记录 Matter 与所有客户的多对多关系。
- `primary_material_id` 是 Evidence 的主要来源资料字段，用于快速定位最关键的来源 Material。
- `material_evidence` 用于表达 Material 与 Evidence 间的多对多关系，支持一个证据关联多个资料，或一个资料支持多个证据。
- `related_document_id` / `related_evidence_id` / `related_task_id` 是 Timeline V1 的简单关联字段，用于快速表达常见关联。
- `timeline_documents` / `timeline_evidence` / `timeline_tasks` 是扩展关系表，用于补充更复杂的多对多关系场景。
- `AI_Work_Record` 可以关联任意业务对象，但 `source_object` / `source_object_id` 不是严格外键，旨在记录来源对象类型与 ID，而不改变业务真相。
- `Knowledge` 可以通过 `matter_id` 或 `source_matter_id` 关联 Matter：前者表示当前归属案件，后者表示生成该知识条目的原始 Matter。

## 7. Delete and Archive Rules

- V1 优先 archive，不物理删除业务记录。
- 删除 Matter 前必须人工确认，避免误删业务根对象。
- 归档 Matter 后，相关 Matter_Workspace 和业务对象应进入归档或只读状态。
- AI 不允许自动删除正式业务对象；AI 只能建议归档或标记状态。

## 8. V2 Reserved

后续 V2 可考虑引入：

- `users` 表
- `teams`
- `permissions`
- `audit_logs`
- `document_versions`
- `vector_indexes`
- `full-text search`
- 更复杂的级联规则

## 9. Freeze Conclusion

该关系设计保持了 LawDesk V1 的核心架构原则：Matter 为中心，Matter_Workspace 为聚合入口，关系通过 `matter_id` 和关系表表达。

该设计可支撑 V1 Database、API、AI Runtime 和 UI 开发，且不依赖于新的 Domain Model 或 Workflow 重设计。