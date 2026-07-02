---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Naming Convention
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 07_naming_convention

## 1. Naming Principles

说明：

- 使用英文。
- 全部 snake_case。
- 名称表达业务含义。
- 不使用缩写。
- 不使用拼音。
- 保持一致性。

---

## 2. Table Naming

规则：

- 全部使用复数名词。
- 全部小写。
- snake_case。

示例：

- matters
- clients
- materials
- evidence
- documents
- timelines
- tasks
- research
- knowledge
- ai_work_records
- matter_workspaces

关系表：

- matter_clients
- material_evidence
- document_evidence
- document_research
- timeline_documents
- timeline_evidence
- timeline_tasks

---

## 3. Column Naming

统一规则：

主键：

- id

外键：

- matter_id
- client_id
- document_id
- material_id
- evidence_id
- timeline_id
- task_id
- research_id
- knowledge_id
- workspace_id

时间：

- created_at
- updated_at
- deleted_at
- archived_at
- confirmed_at

状态：

- status
- priority
- risk_level

编号：

- matter_no
- task_no
- document_no
- workspace_no

AI：

- ai_summary
- ai_next_action
- ai_risk_tip

---

## 4. Boolean Naming

统一：

- is_xxx
- has_xxx
- confirmed_by_lawyer

示例：

- is_duplicate
- is_candidate_evidence

---

## 5. Enum Naming

- 全部小写。
- 使用下划线。

示例：

- waiting_review
- case_acceptance
- trial_preparation
- knowledge_capture

---

## 6. Foreign Key Naming

统一：

- xxx_id

禁止：

- matterId
- MatterID
- matterID

---

## 7. API Compatibility

说明：

- 数据库字段与 REST API 字段保持一致。
- API 不重新命名数据库字段。
- 避免：snake_case / camelCase 混用。

---

## 8. Reserved Naming

未来保留：

- users
- teams
- permissions
- audit_logs
- notifications
- prompt_packs
- model_routes

---

## 9. Forbidden Naming

禁止：

- tmp
- test
- data1
- data2
- table1
- foo
- bar
- case_table
- my_table
- 拼音
- 缩写

---

## 10. Freeze Conclusion

说明：

该命名规范适用于：

- Database
- Migration
- API
- AI Runtime
- Frontend
- Documentation

整个 LawDesk V1 生命周期保持一致。
