---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Database Migration
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 07_migration

## 1. Migration Principles

- Migration 用于把 Schema、Relations、Indexes、Constraints 落成可执行数据库变更。
- Migration 不定义业务规则。
- Migration 不修改 Domain Model。
- Migration 不修改 Workflow。
- Migration 不修改 API。
- Database 是 Source of Truth。
- V1 Migration 必须可审计、可回滚、可重复验证。

## 2. Migration Naming

统一命名格式：

YYYYMMDDHHMMSS_<action>_<target>.sql

示例：

- 20260701000100_create_matters.sql
- 20260701000200_create_clients.sql
- 20260701000300_create_materials.sql
- 20260701000400_create_evidence.sql

命名规则：

- 时间戳必须递增。
- action 使用 create / alter / add / remove / fix。
- target 使用表名或约束名。
- 文件名不得重复。
- 文件名不得修改历史含义。

## 3. Execution Order

V1 首次建表顺序：

1. matters
2. clients
3. materials
4. evidence
5. documents
6. tasks
7. timelines
8. workflow_events
9. ai_records
10. knowledge
11. workspaces

执行阶段顺序：

1. Create Tables
2. Add Primary Keys
3. Add Domain Identity Unique Constraints
4. Add matter_id Foreign Keys
5. Add Reference Foreign Keys
6. Add CHECK Constraints
7. Add Indexes
8. Validate Constraints

## 4. Rollback Rules

每个 Migration 必须具备 rollback 方案。

Rollback 原则：

- 不得破坏 Source of Truth。
- 不得默认删除业务数据。
- 删除表属于 V2。
- 删除字段属于 V2。
- 生产环境禁止 destructive rollback。
- Rollback 应优先采用 reversible change。
- 数据修复必须单独 migration。

## 5. Destructive Migration

V1 禁止破坏性迁移。

破坏性迁移包括：

- drop table
- drop column
- truncate table
- destructive cascade delete
- irreversible data rewrite

如确需破坏性迁移：

必须进入 V2。

## 6. Schema Migration Rules

Migration 必须遵循：

03_schema.md

不得新增未注册表。

不得新增未注册字段。

不得删除 Frozen 字段。

不得改变 Domain Identity 字段含义。

## 7. Relation Migration Rules

Migration 必须遵循：

04_table_relation.md

不得创建 Cross-Matter Ownership。

不得默认创建 Cross-Matter Reference。

不得创建反向 Event 关系：

- timelines -> workflow_events
- timelines -> ai_records

## 8. Index Migration Rules

Migration 必须遵循：

05_indexes.md

不得删除 V1 Frozen Index。

新增 Index 属于 V2，除非用于性能修复。

性能修复索引必须说明原因。

## 9. Constraint Migration Rules

Migration 必须遵循：

06_constraints.md

不得弱化 NOT NULL。

不得弱化 UNIQUE。

不得弱化 FOREIGN KEY。

不得弱化 CHECK。

不得启用默认 cascade delete。

## 10. Seed Data Boundary

Migration 不负责业务 Seed Data。

Seed Data 应由：

08_seed_data.md

定义。

Migration 仅负责结构变更。

允许：

- 初始化枚举约束
- 初始化系统级静态配置

禁止：

- 初始化业务案件
- 初始化客户数据
- 初始化测试数据

## 11. Validation Rules

Migration 执行后必须验证：

- 所有表存在。
- 所有主键存在。
- 所有 Domain Identity 唯一约束存在。
- 所有 matter_id 外键存在。
- 所有 Reference 外键符合 Table Relation。
- 所有 CHECK 约束存在。
- 所有 V1 Index 存在。
- 禁止默认 cascade delete。

## 12. Constraints Boundary

Migration 不得：

- 定义业务规则
- 修改 Domain Model
- 修改 Workflow
- 修改 API

## 13. Freeze Rules

V1 Database Migration 规范已冻结。

修改历史 Migration 必须进入 V2。

删除 Migration 必须进入 V2。

新增 Migration 必须遵守本规范。

## 14. Freeze Conclusion

该文档定义 LawDesk V1 Database Migration 官方规范。

Migration 用于结构变更落地，不定义业务规则。

Database 是 Source of Truth。

V1 Migration 必须可审计、可回滚、可重复验证。

本规范自 V1 起正式冻结。
