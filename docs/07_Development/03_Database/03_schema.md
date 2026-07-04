---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Database Schema
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 03_schema

## 1. Schema Principles

Database Schema 是 Domain Model 的持久化实现。

Database Schema 不定义业务规则。

Database 是 Source of Truth。

Matter 是唯一 Aggregate Root。

所有非 `matters` 表必须包含 `matter_id` 作为核心外键。

Ownership 通过 `matter_id` 落库。

Reference 不等于 Ownership。

本文件仅定义 Schema 规范，不定义 Workflow、API、Runtime、UI 或架构。

## 2. Core Tables

### matters
- table_name: matters
- purpose: 持久化 Matter 对象，作为唯一 Aggregate Root 的核心表
- primary_key: id (UUID)
- matter_id rule: `matter_id` 为 Matter Domain Identity；在本表中必须存在且唯一
- required fields:
	- id (UUID)
	- matter_id (text)
	- title (text)
	- description (text)
	- matter_type (text)
	- status (text)
	- created_at (timestamp with time zone)
	- updated_at (timestamp with time zone)
- optional fields:
	- closed_at (timestamp with time zone)
	- archived_at (timestamp with time zone)
- timestamps:
	- created_at
	- updated_at
	- closed_at
	- archived_at
- ownership rule: Matter 自身不通过外部 `matter_id` 归属其他对象
- reference rule: 可被其他表通过 `matter_id` 引用；Reference 不改变 Ownership
- lifecycle/status field: `status` 对应 Matter Lifecycle
- freeze notes: Matter is the only Aggregate Root

### clients
- table_name: clients
- purpose: 持久化 Client 对象
- primary_key: id (UUID)
- matter_id rule: 必须包含 `matter_id`，外键指向 `matters.matter_id`
- required fields:
	- id (UUID)
	- client_id (text)
	- matter_id (text)
	- name (text)
	- client_type (text)
	- contact_info (jsonb)
	- status (text)
	- created_at (timestamp with time zone)
	- updated_at (timestamp with time zone)
- optional fields: none
- timestamps:
	- created_at
	- updated_at
- ownership rule: Ownership 通过 `matter_id` 落库
- reference rule: 可引用其他对象但不得改变 Ownership
- lifecycle/status field: `status`
- freeze notes: 非 Matter 表必须包含 `matter_id`

### materials
- table_name: materials
- purpose: 持久化 Material 对象
- primary_key: id (UUID)
- matter_id rule: 必须包含 `matter_id`，外键指向 `matters.matter_id`
- required fields:
	- id (UUID)
	- material_id (text)
	- matter_id (text)
	- title (text)
	- material_type (text)
	- source (text)
	- storage_uri (text)
	- status (text)
	- created_at (timestamp with time zone)
	- updated_at (timestamp with time zone)
- optional fields: none
- timestamps:
	- created_at
	- updated_at
- ownership rule: Ownership 通过 `matter_id` 落库
- reference rule: `source` 或其他引用字段不改变 Ownership
- lifecycle/status field: `status`
- freeze notes: 与 Domain Model Material 语义一致

### evidence
- table_name: evidence
- purpose: 持久化 Evidence 对象
- primary_key: id (UUID)
- matter_id rule: 必须包含 `matter_id`，外键指向 `matters.matter_id`
- required fields:
	- id (UUID)
	- evidence_id (text)
	- matter_id (text)
	- material_id (text)
	- title (text)
	- evidence_type (text)
	- description (text)
	- relevance (text)
	- status (text)
	- created_at (timestamp with time zone)
	- updated_at (timestamp with time zone)
- optional fields: none
- timestamps:
	- created_at
	- updated_at
- ownership rule: Ownership 通过 `matter_id` 落库
- reference rule: `material_id` 是引用，不改变 Evidence Ownership
- lifecycle/status field: `status`
- freeze notes: Reference does not equal Ownership

### documents
- table_name: documents
- purpose: 持久化 Document 对象
- primary_key: id (UUID)
- matter_id rule: 必须包含 `matter_id`，外键指向 `matters.matter_id`
- required fields:
	- id (UUID)
	- document_id (text)
	- matter_id (text)
	- title (text)
	- document_type (text)
	- version (text)
	- content_uri (text)
	- status (text)
	- created_at (timestamp with time zone)
	- updated_at (timestamp with time zone)
- optional fields: none
- timestamps:
	- created_at
	- updated_at
- ownership rule: Ownership 通过 `matter_id` 落库
- reference rule: `content_uri` 为内容引用，不改变 Ownership
- lifecycle/status field: `status`
- freeze notes: 与 Domain Model Document 语义一致

### tasks
- table_name: tasks
- purpose: 持久化 Task 对象
- primary_key: id (UUID)
- matter_id rule: 必须包含 `matter_id`，外键指向 `matters.matter_id`
- required fields:
	- id (UUID)
	- task_id (text)
	- matter_id (text)
	- title (text)
	- description (text)
	- priority (text)
	- due_date (timestamp with time zone)
	- status (text)
	- created_at (timestamp with time zone)
	- updated_at (timestamp with time zone)
- optional fields: none
- timestamps:
	- created_at
	- updated_at
- ownership rule: Ownership 通过 `matter_id` 落库
- reference rule: 优先级与到期时间不改变 Ownership
- lifecycle/status field: `status`
- freeze notes: 与 Domain Model Task 语义一致

### timelines
- table_name: timelines
- purpose: 持久化 Timeline 对象（业务历史事件）
- primary_key: id (UUID)
- matter_id rule: 必须包含 `matter_id`，外键指向 `matters.matter_id`
- required fields:
	- id (UUID)
	- timeline_id (text)
	- matter_id (text)
	- event_type (text)
	- event_time (timestamp with time zone)
	- description (text)
	- source (text)
	- status (text)
	- created_at (timestamp with time zone)
	- updated_at (timestamp with time zone)
- optional fields: none
- timestamps:
	- created_at
	- updated_at
- ownership rule: Ownership 通过 `matter_id` 落库
- reference rule: `source` 表示来源，不改变 Ownership
- lifecycle/status field: `status`
- freeze notes: Timeline 记录业务历史，不替代 Workflow Event 或 AI Record

### workflow_events
- table_name: workflow_events
- purpose: 持久化 Workflow Event 对象（Workflow Runtime 事件记录）
- primary_key: id (UUID)
- matter_id rule: 必须包含 `matter_id`，外键指向 `matters.matter_id`
- required fields:
	- id (UUID)
	- workflow_event_id (text)
	- matter_id (text)
	- workflow_id (text)
	- event_type (text)
	- event_time (timestamp with time zone)
	- source (text)
	- payload (jsonb)
	- status (text)
	- created_at (timestamp with time zone)
	- updated_at (timestamp with time zone)
- optional fields: none
- timestamps:
	- created_at
	- updated_at
- ownership rule: Ownership 通过 `matter_id` 落库
- reference rule: `workflow_id` 为引用，不改变 Ownership
- lifecycle/status field: `status`
- freeze notes: 表仅持久化事件，不定义 Workflow

### ai_records
- table_name: ai_records
- purpose: 持久化 AI Record 对象（AI Runtime 工作记录）
- primary_key: id (UUID)
- matter_id rule: 必须包含 `matter_id`，外键指向 `matters.matter_id`
- required fields:
	- id (UUID)
	- ai_record_id (text)
	- matter_id (text)
	- ai_task_type (text)
	- model (text)
	- prompt_uri (text)
	- result_uri (text)
	- status (text)
	- created_at (timestamp with time zone)
	- updated_at (timestamp with time zone)
- optional fields: none
- timestamps:
	- created_at
	- updated_at
- ownership rule: Ownership 通过 `matter_id` 落库
- reference rule: `prompt_uri` 与 `result_uri` 为引用，不改变 Ownership
- lifecycle/status field: `status`
- freeze notes: 表仅持久化 AI 记录，不定义 AI Runtime

### knowledge
- table_name: knowledge
- purpose: 持久化 Knowledge 对象
- primary_key: id (UUID)
- matter_id rule: 必须包含 `matter_id`，外键指向 `matters.matter_id`
- required fields:
	- id (UUID)
	- knowledge_id (text)
	- matter_id (text)
	- title (text)
	- category (text)
	- content_uri (text)
	- source (text)
	- version (text)
	- status (text)
	- created_at (timestamp with time zone)
	- updated_at (timestamp with time zone)
- optional fields: none
- timestamps:
	- created_at
	- updated_at
- ownership rule: Ownership 通过 `matter_id` 落库
- reference rule: `content_uri` 与 `source` 为引用，不改变 Ownership
- lifecycle/status field: `status`
- freeze notes: 与 Domain Model Knowledge 语义一致

### workspaces
- table_name: workspaces
- purpose: 持久化 Workspace 对象（Runtime Workspace 配置与视图状态）
- primary_key: id (UUID)
- matter_id rule: 必须包含 `matter_id`，外键指向 `matters.matter_id`
- required fields:
	- id (UUID)
	- workspace_id (text)
	- matter_id (text)
	- layout (jsonb)
	- view_config (jsonb)
	- preferences (jsonb)
	- status (text)
	- created_at (timestamp with time zone)
	- updated_at (timestamp with time zone)
- optional fields: none
- timestamps:
	- created_at
	- updated_at
- ownership rule: Ownership 通过 `matter_id` 落库
- reference rule: 仅保存 Workspace 配置引用，不拥有其他 Domain Object
- lifecycle/status field: `status`
- freeze notes:
	- Workspace is a Runtime Workspace.
	- Workspace owns no Domain Object.

## 3. Unified Field Rules

- 所有 11 张表必须包含：`id`、`created_at`、`updated_at`。
- 除 `matters` 外，所有表必须包含：`matter_id`。
- 所有表状态字段统一为：`status`。

## 4. Mapping Consistency

本 Schema 与 `02_domain_model_mapping.md` 保持一一对应：

- Matter -> matters
- Client -> clients
- Material -> materials
- Evidence -> evidence
- Document -> documents
- Task -> tasks
- Timeline -> timelines
- Workflow Event -> workflow_events
- AI Record -> ai_records
- Knowledge -> knowledge
- Workspace -> workspaces

## 5. Constraints

03_schema.md 不得：

- 定义 Workflow
- 定义 API
- 定义 Runtime
- 定义业务规则
- 修改 Domain Model 语义

## Freeze Rules

This specification is frozen for LawDesk V1.

Future evolution belongs to V2.

## 6. Freeze Conclusion

该文档定义 LawDesk V1 Database Schema 官方规范。

Database Schema 是 Domain Model 的持久化实现。

Database Schema 不定义业务规则。

Database 是 Source of Truth。

Matter 是唯一 Aggregate Root。

Ownership 通过 `matter_id` 落库，Reference 不等于 Ownership。

本规范自 V1 起正式冻结。
