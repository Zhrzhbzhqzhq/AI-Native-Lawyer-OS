---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Document
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 06_document

## 1. Purpose

Document 定义 LawDesk 的法律文书对象（Legal Document）。

Document 用于表示：

- 起诉状
- 答辩状
- 代理词
- 法律意见书
- 庭审提纲
- 执行申请书
- 合同草案
- 和解协议
- 其他法律文书

Document 是 Domain Object。

不是 Workflow。

不是 Runtime。

---

## 2. Responsibilities

Document 负责：

- Document Identity
- Document Type
- Document Title
- Document Version
- Draft Content
- Author
- Related Matter
- Related Material
- Related Evidence

Document 不负责：

- Workflow
- Validation
- Runtime
- Submission
- Court Delivery

---

## 3. Identity

Identity：

- document_id

Identity Immutable。

---

## 4. Aggregate Relationship

Document belongs to Matter.

Document is not an Aggregate Root.

Matter is the only Aggregate Root.

---

## 5. Ownership

Ownership belongs to Matter.

Cross-Matter Ownership is prohibited.

---

## 6. Relationships

Document 可以引用：

- Matter
- Client
- Material
- Evidence
- Task
- Timeline
- AI Record
- Knowledge

Reference does not equal Ownership.

---

## 7. Lifecycle

Document Lifecycle：

Created

↓

Drafting

↓

Reviewed

↓

Confirmed

↓

Archived

Matter Lifecycle 对 Document Lifecycle 生效。

Workflow 决定状态迁移。

---

## 8. Workflow Relationship

Workflow 可以：

- Create Document
- Update Document
- Review Document

Workflow 不拥有 Document。

Workflow 不定义 Document。

---

## 9. Database Mapping

保持官方唯一 Mapping：

Document

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

API 不拥有 Document。

API 不定义 Document。

---

## 11. AI Relationship

AI 可以：

- Analyze
- Suggest
- Draft
- Review
- Summarize

AI 不可以：

- Modify Document
- Confirm Document
- Submit Document
- Change Lifecycle

统一执行链：

Lawyer Confirms

↓

API Executes

↓

Database Updates

---

## 12. Constraints

Document 不得：

- 定义 Workflow
- 定义 API
- 定义 Database
- 定义 Runtime
- 修改业务状态

---

## 13. Freeze Rules

保持与 Evidence 完全一致。

仅替换：

Evidence

↓

Document

---

## 14. V2 Reserved

未来可考虑：

- Document Version History
- Collaborative Editing
- Electronic Signature
- Court Submission Package
- Document Template Library

---

## 15. Freeze Conclusion

保持与 Evidence 完全一致。

仅替换：

Evidence

↓

Document
