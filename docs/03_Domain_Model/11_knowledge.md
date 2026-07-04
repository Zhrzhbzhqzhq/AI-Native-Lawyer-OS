---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Knowledge
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 11_knowledge

## 1. Purpose

Knowledge 定义 LawDesk 的知识沉淀对象（Knowledge）。

Knowledge 用于沉淀律师在案件办理过程中形成的可复用知识资产。

例如：

- Case Summary
- Legal Strategy
- Litigation Experience
- Evidence Rules
- Draft Template
- Court Practice
- Legal Research Result
- AI Curated Knowledge

Knowledge 属于 Domain Object。

Knowledge 不是 Workflow。

Knowledge 不是 Runtime。

Knowledge 不是 Today。

Knowledge 不负责驱动业务流程。

Knowledge = Reusable Knowledge Asset.

---

## 2. Responsibilities

Knowledge 负责：

- Knowledge Identity
- Knowledge Title
- Knowledge Category
- Knowledge Content
- Knowledge Source
- Knowledge Version
- Related Matter
- Related Document
- Related Evidence
- Related AI Record

Knowledge 不负责：

- Workflow
- Runtime
- Today Generation
- Workflow Execution
- Domain Object Modification

---

## 3. Identity

Identity：

- knowledge_id

Identity Immutable.

---

## 4. Aggregate Relationship

Knowledge belongs to Matter.

Knowledge is not an Aggregate Root.

Matter is the only Aggregate Root.

---

## 5. Ownership

Ownership belongs to Matter.

Cross-Matter Ownership is prohibited.

---

## 6. Relationships

Knowledge 可以引用：

- Matter
- Document
- Material
- Evidence
- Task
- Timeline
- Workflow Event
- AI Record

Reference does not equal Ownership.

Knowledge 来源于：

- Matter
- Document
- Evidence
- AI Record
- Timeline

Knowledge 不替代：

- Timeline
- Workflow Event
- AI Record

---

## 7. Lifecycle

Knowledge Lifecycle：

Created

↓

Curated

↓

Published

↓

Archived

Matter Lifecycle 对 Knowledge Lifecycle 生效。

Knowledge 不负责状态迁移。

Knowledge 可被未来 Matter 复用。

---

## 8. Workflow Relationship

Workflow 可以：

- Create Knowledge
- Read Knowledge

Workflow 不拥有 Knowledge。

Workflow 不定义 Knowledge。

Knowledge 不驱动 Workflow。

---

## 9. Database Mapping

保持官方唯一 Mapping：

Knowledge

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

API：

仅作为 Domain Model 的访问接口。

API 不拥有 Knowledge。

API 不定义 Knowledge。

---

## 11. AI Relationship

AI 可以：

- Analyze
- Suggest
- Summarize
- Curate
- Classify

AI 不可以：

- Modify Knowledge
- Publish Knowledge
- Delete Knowledge
- Change Knowledge Lifecycle

统一执行链：

Lawyer Confirms

↓

API Executes

↓

Database Updates

---

## 12. Constraints

Knowledge 不得：

- 定义 Workflow
- 执行 Workflow
- 修改 Domain Object
- 替代 Timeline
- 替代 Workflow Event
- 替代 AI Record
- 定义 API
- 定义 Database
- 定义 Runtime

Today Runtime 可以展示 Knowledge。

Today Runtime 不拥有 Knowledge。

Today Runtime 不修改 Knowledge。

---

## 13. Freeze Rules

保持与 Task 完全一致。

仅替换：

Task

↓

Knowledge

---

## 14. V2 Reserved

未来可考虑：

- Knowledge Graph
- Knowledge Tag
- Knowledge Recommendation
- Cross-Matter Knowledge
- Knowledge Version Compare
- Knowledge Citation

---

## 15. Freeze Conclusion

保持与 Task 完全一致。

仅替换：

Task

↓

Knowledge
