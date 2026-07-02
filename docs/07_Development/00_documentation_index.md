---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Documentation Index
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation registry updates are allowed.
- Business rule changes must be made in the corresponding specification.
---

# 00_documentation_index

## 1. Purpose

Documentation Index 是 LawDesk V1 开发文档体系的统一规范注册表（Specification Registry）。

本文档用于统一管理：

- 全部开发规范
- 文档状态
- 模块归属
- 文档依赖关系
- 冻结状态
- 阅读顺序

Documentation Index 不定义业务规则。

---

## 2. Documentation Hierarchy

整个开发文档体系采用以下层级：

Documentation Style Guide

↓

Documentation Index

↓

README

↓

Domain

↓

Workflow

↓

Database

↓

API

↓

AI Runtime

↓

UI

↓

Implementation

所有开发文档均应遵循该层级。

---

## 3. Specification Registry

| Document | Module | Status | Version |
|----------|--------|--------|---------|
| 00_documentation_style_guide.md | Meta | Frozen | V1.0 |
| 00_documentation_index.md | Meta | Frozen | V1.0 |
| README.md | Navigation | Frozen | V1.0 |

---

### Domain

| Document | Status | Version |
|----------|--------|---------|
| 01_domain_model.md | Draft | V1.0 |

---

### Workflow

| Document | Status | Version |
|----------|--------|---------|
| 00_workflow_index.md | Frozen | V1.0 |
| 01_workflow_principles.md | Frozen | V1.0 |
| 02_matter_lifecycle.md | Frozen | V1.0 |
| 03_workflow_events.md | Frozen | V1.0 |
| 04_state_transition_rules.md | Frozen | V1.0 |
| 05_workflow_validation.md | Draft | V1.0 |
| 06_today_generation.md | Draft | V1.0 |
| 07_ai_intervention.md | Draft | V1.0 |

---

### Database

| Document | Status | Version |
|----------|--------|---------|
| 01_schema.md | Frozen | V1.0 |
| 02_table_relation.md | Frozen | V1.0 |
| 03_indexes.md | Frozen | V1.0 |
| 04_migration.md | Frozen | V1.0 |
| 05_seed_data.md | Frozen | V1.0 |
| 06_constraints.md | Frozen | V1.0 |
| 07_naming_convention.md | Frozen | V1.0 |

---

### API

| Document | Status | Version |
|----------|--------|---------|
| 01_api_principles.md | Frozen | V1.0 |
| 02_rest_conventions.md | Frozen | V1.0 |
| 03_api_resources.md | Frozen | V1.0 |
| 04_matter_api.md | Frozen | V1.0 |

---

### AI

| Document | Status | Version |
|----------|--------|---------|
| （待建立） | Draft | V1.0 |

---

### UI

| Document | Status | Version |
|----------|--------|---------|
| （待建立） | Draft | V1.0 |

---

## 4. Document Status

所有规范采用统一状态。

- Draft
- Review
- Frozen
- Deprecated（V2）

状态说明：

Draft

正在设计，可修改。

Review

评审阶段，仅允许评审意见修改。

Frozen

正式冻结，仅允许文字修正。

Deprecated

停止维护，由新版规范替代。

---

## 5. Dependency Order

推荐依赖关系：

Documentation Style Guide

↓

Documentation Index

↓

README

↓

Domain

↓

Workflow

↓

Database

↓

API

↓

AI Runtime

↓

UI

↓

Implementation

上层规范优先级高于下层规范。

---

## 6. Ownership

每份规范均应包含：

- Owner
- Module
- Version
- Status
- Last Updated

统一采用 Freeze Header。

---

## 7. Modification Rules

修改规范时必须遵循：

1. Documentation Style Guide
2. Documentation Index
3. 对应模块规范

不得直接修改已冻结规范。

涉及业务规则修改：

必须进入 V2。

---

## 8. Freeze Conclusion

该文档定义 LawDesk V1 Documentation Registry 官方规范。

Documentation Index 是整个开发文档体系的统一规范注册表。

本规范自 V1 起正式冻结。

Database、API、Workflow、AI Runtime、Frontend 及所有 V1 实现必须遵守本规范。

任何规范状态或业务规则修改必须进入 V2。
