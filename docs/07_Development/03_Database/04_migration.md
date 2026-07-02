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
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 04_migration

## 1. Migration Principles

- 迁移必须小步提交，每次只做一类变更。
- 建表、建外键、建索引应分阶段执行。
- 不直接修改已发布的 migration 文件。
- 生产环境只追加新 migration，不回滚已发布历史。
- V1 初始阶段允许重建本地数据库，但进入 Beta 后不允许随意重建。

## 2. Migration Order

### Step 1: PostgreSQL Extension

- 启用 UUID 生成能力。
- 例如 `pgcrypto` 或 `uuid-ossp`。
- V1 推荐使用 `gen_random_uuid()`。

### Step 2: Core Independent Tables

- 创建：`clients`

### Step 3: Matter Table

- 创建：`matters`

说明：

- `matters.primary_client_id` 可引用 `clients(id)`。
- `matters.owner_id` 目前不建外键。

### Step 4: Matter Workspace

- 创建：`matter_workspaces`

说明：

- `matter_workspaces.matter_id` references `matters(id)`。
- 对 `matter_workspaces.matter_id` 建唯一约束，保证一个 Matter 只有一个 Workspace。

### Step 5: Matter-Owned Core Tables

- 创建：
  - `materials`
  - `evidence`
  - `documents`
  - `timelines`
  - `tasks`
  - `research`
  - `knowledge`
  - `ai_work_records`

说明：

- 这些表均通过 `matter_id` 归属 Matter。

### Step 6: Relation Tables

- 创建：
  - `matter_clients`
  - `material_evidence`
  - `document_evidence`
  - `document_research`
  - `timeline_documents`
  - `timeline_evidence`
  - `timeline_tasks`

### Step 7: Indexes

- 根据 `03_indexes.md` 创建索引：
  - unique indexes
  - foreign key indexes
  - Today indexes
  - AI indexes
  - relation unique constraints

### Step 8: Seed Data

- 根据 `05_seed_data.md` 初始化：
  - default enum references
  - default workflow definitions
  - default AI roles
  - default system prompts

## 3. Rollback Strategy

- 本地开发阶段可 drop database 重建。
- Beta 后必须使用 down migration。
- 删除表必须谨慎。
- 删除字段必须先废弃再移除。
- 数据迁移必须先备份。

## 4. Migration Naming Convention

建议命名：

- `001_enable_uuid_extension.sql`
- `002_create_clients.sql`
- `003_create_matters.sql`
- `004_create_matter_workspaces.sql`
- `005_create_matter_owned_tables.sql`
- `006_create_relation_tables.sql`
- `007_create_indexes.sql`
- `008_seed_data.sql`

## 5. Environment Strategy

Local:
- 可快速重建数据库。
- 用于开发和测试。

Staging:
- 用于验证 migration。
- 所有 migration 必须先跑 Staging。

Production:
- 只允许追加 migration。
- 禁止手工改表。
- 禁止直接改生产数据。

## 6. V1 Constraints

- 不引入多租户。
- 不引入团队权限。
- 不引入 `users` 表外键。
- 不引入全文搜索。
- 不引入向量数据库。
- 不引入复杂文档版本历史。

## 7. Freeze Conclusion

该 migration 策略可支撑 V1 PostgreSQL 初始化、后续 API 开发和本地测试。
