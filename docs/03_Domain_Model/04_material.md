---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Material
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 04_material

## 1. Purpose

Material 定义 LawDesk V1 的案件资料职责。

Material 是：

- Matter 的案件资料对象
- Domain Entity
- Matter 的组成部分

Material 不负责：

- Workflow
- API
- Database
- Runtime

---

## 2. Responsibilities

Material 负责：

- 保存案件资料
- 保存原始材料
- 保存上传内容
- 为 Evidence 提供来源
- 为 AI Analysis 提供输入

Material 不负责：

- Workflow
- Validation
- Lifecycle Transition
- Evidence Determination

---

## 3. Identity

Material 的 Identity 为：

- material_id

Identity：

- Immutable
- Unique
- Stable

Identity 一旦生成不得修改。

---

## 4. Aggregate Relationship

Material belongs to Matter.

Material is not an Aggregate Root.

---

## 5. Ownership

Ownership belongs to Matter.

Cross-Matter Ownership is prohibited.

---

## 6. Relationships

Material 可以引用：

- Client
- Evidence
- Document
- Knowledge

Reference does not equal Ownership.

---

## 7. Lifecycle

Material 定义自己的生命周期。

Matter Lifecycle 对 Material 生效。

Workflow 决定状态迁移。

---

## 8. Workflow Relationship

Workflow：

引用 Material。

Material：

不定义 Workflow。

---

## 9. Database Mapping

保持官方 Mapping：

Material

↓

Database Schema

↓

API Resource

↓

Workflow Runtime

↓

Today Runtime

---

## 10. API Relationship

不得重新定义 Mapping。

引用第 9 节官方 Mapping。

补充说明：

- API Resource 来源于 Material。
- API 不拥有 Material。
- API 不定义 Material。
- API 仅作为 Domain Model 的访问接口。

---

## 11. AI Relationship

AI 可以：

- Analyze
- Suggest
- Draft
- Review
- Summarize

AI 不拥有 Material。

AI 不修改 Material。

统一修改链：

Lawyer Confirms

↓

API Executes

↓

Database Updates

---

## 12. Constraints

Material：

不得：

- 定义 Workflow
- 定义 API
- 定义 Database
- 定义 Runtime
- 修改业务状态

---

## 13. Freeze Rules

保持与 Client 完全一致。

---

## 14. V2 Reserved

例如：

- Multiple File Versions
- Material Classification Extension
- External Material Sync
- Material Review Workflow Extension

---

## 15. Freeze Conclusion

该文档定义 LawDesk V1 Material 官方规范。

Material 是 Matter 的 Domain Entity。

Material 不属于 Aggregate Root。

本规范自 V1 起正式冻结。

Workflow、Database、API、AI Runtime、Frontend 及所有 V1 实现必须遵守本规范。

任何 Material 修改必须进入 V2。
