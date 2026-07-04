---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Domain Model ↔ Database Mapping
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 02_domain_model_mapping

## 1. Purpose

本文件定义 LawDesk V1 Domain Model 到 Database Schema 的官方映射规范。

Database Schema 是 Domain Model 的持久化实现。

Database Schema 不定义业务规则。

Database 是 Source of Truth。

Domain Model 的正式规范与定义以 `docs/03_Domain_Model` 目录下的冻结文档为准。

## 2. Mapping Principles

- Domain Model defines business meaning.
- Database Schema persists Domain Model state.
- Database does not define business rules.
- Database is the Source of Truth for persisted V1 business state.
- All non-Matter tables use `matter_id` as the core foreign key.
- Matter is the only Aggregate Root.
- Ownership is stored through `matter_id`.
- Reference does not equal Ownership.
- V1 does not support Cross-Matter Ownership.

## 3. Official Mapping

Domain Object -> Database Table

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

Matter is the only Aggregate Root.

matter_id is the core foreign key for all non-Matter tables.

Ownership is persisted through matter_id.

Reference relationships do not change Ownership.

## 4. Event Object Tables

The Event Object tables are:

- timelines
- workflow_events
- ai_records

These tables record event-like runtime history and do not replace business entity tables.

## 5. Workspace Mapping

Workspace -> workspaces

Workspace is a Runtime Workspace.

Workspace belongs to Matter.

Workspace owns no Domain Object.

Workspace does not become an Aggregate Root.

## 6. Constraints

- Database Schema does not define Workflow.
- Database Schema does not define API.
- Database Schema does not define AI Runtime.
- Database Schema does not define UI.
- Database Schema does not define business rules.
- Database Schema does not define architecture.
- V1 does not support Cross-Matter Ownership.
- All non-Matter tables must carry `matter_id` as the primary ownership foreign key.

## 7. Freeze Conclusion

The Domain Model Mapping is officially frozen.

Workflow Runtime, API Resource, AI Runtime, Today Runtime, and Database implementations must follow this mapping.

Any semantic change must target V2.
