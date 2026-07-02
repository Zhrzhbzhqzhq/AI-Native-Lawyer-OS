---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Workflow Validation
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 05_workflow_validation

## 1. Purpose

定义 Workflow Validation 的职责。

Validation 用于决定：

- 是否允许状态转换
- 是否允许业务动作执行
- 是否满足 Workflow Gate

Validation 不修改业务对象。

Validation 仅负责：

Allow / Reject。

Workflow Validation 是 Workflow Gate 的唯一校验规范。

---

## 2. Validation Principles

统一原则：

- Workflow Driven
- Matter Centered
- Validation Before Execution
- Human Confirmation Required
- API Executes
- Database Records Truth
- Today Reflects Workflow

---

## 3. Validation Scope

Validation 至少覆盖：

- Workflow
- Lifecycle
- Matter
- Client
- Permission
- Required Fields
- Required Resources
- Business Constraints
- Deadline
- Related Objects

Validation Scope 定义 Workflow Gate 必须完成的最小校验范围。

---

## 4. Validation Stages

统一采用：

- Pre-Validation
- Business Validation
- Post-Validation

说明每一阶段职责：

- Pre-Validation：验证 Workflow、Matter、Client 与必需数据是否齐备。
- Business Validation：验证期限、业务约束、权限与规则是否满足。
- Post-Validation：验证 Timeline、Today、AI Runtime 与 Database 准备就绪。

---

## 5. Validation Rules

说明：

- Workflow Rules
- Lifecycle Rules
- Business Rules
- Permission Rules
- Required Resource Rules
- Required Field Rules

所有 Validation Rule 均由 Workflow 定义，并由 API 执行。

Validation 不负责修改业务状态，仅负责决定状态转换是否允许执行。

---

## 6. Workflow Gate

定义 Workflow Gate：

Workflow

↓

Validation

↓

API

↓

Database

↓

Workflow Event

↓

Timeline

↓

Today

↓

AI Runtime


任何 Validation 失败：

立即终止。

Database 始终保存最终业务状态（Source of Truth）。

---

## 7. Validation Failure

定义失败行为。

例如：

- WORKFLOW_VALIDATION_FAILED
- PERMISSION_DENIED
- REQUIRED_FIELD_MISSING
- RESOURCE_NOT_FOUND
- BUSINESS_RULE_VIOLATION

Validation 不修改任何业务对象。

Validation Failure 不产生 Workflow Event，不刷新 Timeline、Today 或 AI Runtime。

---

## 8. Validation and AI

AI 可以：

- Analyze
- Suggest
- Review

AI 不可以：

- Confirm
- Submit
- Archive
- Bypass Validation

所有 AI 行为必须经过 Validation。

所有 AI 建议最终由律师确认，并通过 API 执行。

AI Suggests

↓

Lawyer Confirms

↓

API Executes

---

## 9. Validation Constraints

Validation：

不得：

- 绕过 Workflow
- 绕过 API
- 绕过 Permission
- 绕过 Lifecycle

Validation 不保存业务状态。

Validation 不作为业务状态来源。

Database 始终保存最终业务状态（Source of Truth）。

---

## 10. Freeze Rules

V1 Workflow Validation 已冻结。

Validation 顺序不得修改。

Validation Stage 顺序不得修改。

Validation Stage 不得删除。

已发布 Validation Rule 语义不得修改。

新增 Validation Rule 属于 V2。

---

## 11. V2 Reserved

未来可考虑：

- Dynamic Validation
- Custom Validation
- Plugin Validation
- Rule Engine
- Policy Engine

---

## 12. Freeze Conclusion

该文档定义 LawDesk V1 Workflow Validation 官方规范。

Workflow Validation 是 Workflow Gate 的统一校验规范。

本规范自 V1 起正式冻结。

Database、API、Workflow、AI Runtime、Frontend 及所有 V1 实现必须遵守本规范。

任何 Workflow Validation 规则修改必须进入 V2。
