---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: AI Record
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 10_ai_record

## 1. Purpose

AI Record 定义 LawDesk 的 AI Runtime 工作记录对象（AI Record）。

AI Record 用于记录 AI 在案件办理过程中完成的工作。

例如：

- AI Analysis
- AI Suggestion
- AI Draft
- AI Review
- AI Summary
- AI Classification
- AI Extraction

AI Record 是 Domain Object。

AI Record 不是 Workflow。

AI Record 不是 Runtime。

AI Record 不是 Today。

AI Record 不负责驱动业务流程。

AI Record = AI Runtime Work Record.

---

## 2. Responsibilities

AI Record 负责：

- AI Record Identity
- AI Task Type
- AI Model
- AI Prompt
- AI Result
- AI Status
- AI Timestamp
- Related Matter
- Related Document
- Related Material
- Related Evidence

AI Record 不负责：

- Workflow
- Runtime
- Today Generation
- Domain Object Modification
- Workflow Execution

AI Record does not replace Timeline.

AI Record does not replace Workflow Event.

AI Record does not execute Workflow.

AI Record does not own Domain Object.

AI Record does not modify Domain Object.

---

## 3. Identity

Identity：

- ai_record_id

Identity Immutable.

---

## 4. Aggregate Relationship

AI Record belongs to Matter.

AI Record is not an Aggregate Root.

Matter is the only Aggregate Root.

---

## 5. Ownership

Ownership belongs to Matter.

Cross-Matter Ownership is prohibited.

---

## 6. Relationships

AI Record 可以引用：

- Matter
- Task
- Timeline
- Document
- Material
- Evidence
- Workflow Event
- Knowledge

Reference does not equal Ownership.

---

## 7. Lifecycle

AI Record Lifecycle：

Created

↓

Recorded

↓

Archived

Matter Lifecycle 对 AI Record Lifecycle 生效。

AI Runtime 决定 AI Record 产生时机。

AI Record 不负责状态迁移。

---

## 8. Workflow Relationship

Workflow Runtime 可以：

- Create AI Record
- Read AI Record

Workflow Event 可以：

- Reference AI Record

AI Record may append Timeline.

AI Record 不驱动 Workflow。

AI Record 不拥有 Workflow。

---

## 9. Database Mapping

保持官方唯一 Mapping：

AI Record

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

API 不拥有 AI Record。

API 不定义 AI Record。

---

## 11. AI Relationship

AI 可以：

- Analyze
- Suggest
- Draft
- Review
- Summarize
- Extract
- Classify

AI 不可以：

- Modify Domain Object
- Modify Workflow
- Modify Timeline
- Modify Matter Lifecycle
- Modify AI Record Lifecycle

统一执行链：

Lawyer Confirms

↓

API Executes

↓

Database Updates

---

## 12. Constraints

AI Record 不得：

- 定义 Workflow
- 执行 Workflow
- 修改 Domain Object
- 替代 Timeline
- 替代 Workflow Event
- 定义 API
- 定义 Database
- 定义 Runtime

Today Runtime 可以展示 AI Record。

Today Runtime 不拥有 AI Record。

Today Runtime 不修改 AI Record。

---

## 13. Freeze Rules

保持与 Workflow Event 完全一致。

仅替换：

Workflow Event

↓

AI Record

---

## 14. V2 Reserved

未来可考虑：

- AI Session
- AI Conversation
- AI Evaluation
- AI Confidence
- AI Version
- AI Cost

---

## 15. Freeze Conclusion

保持与 Workflow Event 完全一致。

仅替换：

Workflow Event

↓

AI Record
