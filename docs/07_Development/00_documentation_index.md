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

Documentation Index 是 LawDesk V1 唯一规范注册表。

---

## 2. Documentation Hierarchy

整个开发文档体系采用以下层级：

Documentation Style Guide

↓

Documentation Index

↓

README

↓
Release History

↓

Release Candidate

↓

Governance Freeze

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

### Release Documents

| Document | Status | Version |
|----------|--------|---------|
| 97_release_history.md | Frozen | V1.0 |
| 98_release_candidate.md | Frozen | V1.0 RC1 |
| 99_governance_freeze.md | Frozen | V1.0 |

---

### Domain

| Document | Status | Version |
|----------|--------|---------|
| 01_matter.md | Draft | V1.0 |
| 02_client.md | Draft | V1.0 |
| 03_material.md | Draft | V1.0 |
| 04_evidence.md | Draft | V1.0 |
| 05_document.md | Draft | V1.0 |
| 06_timeline.md | Draft | V1.0 |
| 07_task.md | Draft | V1.0 |
| 08_workflow_event.md | Draft | V1.0 |
| 09_knowledge.md | Draft | V1.0 |
| 10_ai_record.md | Draft | V1.0 |
| 11_workspace.md | Draft | V1.0 |

Legacy Archive Note:

`docs/03_Data_Model` is Legacy Archive.

It is not part of LawDesk V1 Official Architecture.

It is excluded from Final RC scope.

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
| 00_database_index.md | Frozen | V1.0 |
| 01_database_principles.md | Frozen | V1.0 |
| 02_domain_model_mapping.md | Frozen | V1.0 |
| 03_schema.md | Frozen | V1.0 |
| 04_table_relation.md | Frozen | V1.0 |
| 05_indexes.md | Frozen | V1.0 |
| 06_constraints.md | Frozen | V1.0 |
| 07_migration.md | Frozen | V1.0 |
| 08_seed_data.md | Frozen | V1.0 |
| 09_naming_convention.md | Frozen | V1.0 |

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
| 01_ai_principles.md | Frozen | V1.0 |
| 02_ai_runtime.md | Frozen | V1.0 |
| 03_ai_record.md | Frozen | V1.0 |
| 04_ai_boundary.md | Frozen | V1.0 |
| 05_prompt_architecture.md | Frozen | V1.0 |
| 06_context_assembly.md | Frozen | V1.0 |
| 07_tool_call.md | Frozen | V1.0 |
| 08_model_management.md | Frozen | V1.0 |

---

### UI

| Document | Status | Version |
|----------|--------|---------|
| 01_ui_principles.md | Frozen | V1.0 |
| 02_layout.md | Frozen | V1.0 |
| 03_components.md | Frozen | V1.0 |
| 04_matter_ui.md | Frozen | V1.0 |
| 05_today_ui.md | Frozen | V1.0 |
| 06_ai_ui.md | Frozen | V1.0 |
| 07_navigation.md | Frozen | V1.0 |
| 08_design_system.md | Frozen | V1.0 |

---

### Application

| Document | Status | Version |
|----------|--------|---------|
| 01_application_principles.md | Frozen | V1.0 |
| 02_today_application.md | Frozen | V1.0 |
| 03_matter_application.md | Frozen | V1.0 |
| 04_ai_workspace.md | Frozen | V1.0 |
| 05_notification_center.md | Frozen | V1.0 |
| 06_search.md | Frozen | V1.0 |
| 07_settings.md | Frozen | V1.0 |
| 08_permissions.md | Frozen | V1.0 |
| 09_application_flow.md | Frozen | V1.0 |

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
Release History

↓

Release Candidate

↓

Governance Freeze

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
