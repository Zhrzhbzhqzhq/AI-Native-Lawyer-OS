---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Seed Data
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 08_seed_data

## 1. Seed Principles

- Seed Data 仅负责初始化系统数据。
- Seed Data 不定义业务规则。
- Seed Data 不替代 Migration。
- Migration 负责数据库结构。
- Seed Data 负责系统初始化数据。
- Database 是 Source of Truth。

Seed Data 必须：

- 可重复执行（Idempotent）
- 可审计（Auditable）
- 可回滚（Rollbackable）
- 可版本管理（Version Controlled）

## 2. Seed Data Scope

允许初始化：

### 2.1 System Enum

例如：

- Matter Status
- Task Priority
- Task Status
- Evidence Type
- Document Type
- Material Type
- AI Task Type
- Knowledge Category
- Workspace Layout

### 2.2 System Dictionary

例如：

- 国家
- 地区
- 法院级别
- 法院类型
- 文书类型
- 案件类型

### 2.3 System Configuration

例如：

- 默认 Workspace
- 默认 Dashboard
- 默认 AI 配置
- 默认系统参数

### 2.4 Static Lookup Tables

例如：

- Status Dictionary
- Enum Dictionary
- Configuration Dictionary

## 3. Forbidden Seed

Seed Data 禁止初始化任何业务对象。

不得创建：

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
- Workspace Instance

不得创建：

- Demo Data
- Test Case
- Sample Matter
- Sample Client

不得导入：

- 真实客户数据

## 4. Seed Data Rules

Seed Data 可以：

- INSERT
- UPSERT
- MERGE

Seed Data 不得：

- UPDATE 已存在业务数据
- DELETE 业务数据
- TRUNCATE 表
- 覆盖用户数据

## 5. Migration Boundary

Migration 负责：

- Schema
- Table
- Constraint
- Index

Seed 负责：

- Enum
- Dictionary
- Configuration
- Static Lookup

两者职责不得交叉。

## 6. Version Rules

Seed Data 必须版本化。

建议命名：

- seed_v1.sql
- seed_v1.1.sql
- seed_v2.sql

不得覆盖历史 Seed。

新增 Seed 应保持向后兼容。

## 7. Execution Rules

Migration

↓

Seed Data

↓

Application Startup

↓

Runtime

Seed 永远不得早于 Migration。

## 8. Validation Rules

Seed 后必须验证：

- 所有 Enum 已初始化。
- 所有 Dictionary 已初始化。
- 所有默认 Configuration 已初始化。
- 不存在业务对象。
- 不存在测试数据。
- 不存在 Demo 数据。

## 9. Constraints Boundary

Seed Data 不得：

- 定义业务规则
- 替代 Migration
- 修改 Schema 结构
- 修改 Table Relation
- 修改 Constraints
- 修改 Index Strategy

## 10. Freeze Rules

V1 Seed Data Specification 已冻结。

新增 Seed 类型属于 V2。

新增业务 Seed 属于 V2。

修改历史 Seed 必须进入 V2。

## 11. Freeze Conclusion

该文档定义 LawDesk V1 Seed Data 官方规范。

Seed Data 仅初始化系统数据，不初始化业务数据。

Migration 与 Seed 职责严格分离。

Seed Data 必须可重复执行、可审计、可回滚、可版本管理。

本规范自 V1 起正式冻结。
