---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Workspace
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, Workflow, API, Domain Model or Schema changes must target V2.
---

# 12_workspace

## 1. Purpose

Workspace 定义 LawDesk 的案件工作区对象（Workspace）。

Workspace 用于组织 Matter 的运行时工作界面。

Workspace 是 Matter 的工作上下文。

Workspace 属于 Domain Object。

Workspace 属于 Business Entity。

Workspace = Runtime Workspace.

Workspace 不是 Workflow。

Workspace 不是 Runtime Engine。

Workspace 不负责驱动业务流程。

Workspace 不拥有任何 Domain Object。

---

## 2. Responsibilities

Workspace 负责：

- Workspace Identity
- Workspace Layout
- Workspace View
- Workspace Preferences
- Workspace State
- Workspace Filters
- Workspace Display Configuration
- Related Matter

Workspace 不负责：

- Workflow
- Database
- API
- Domain Object Ownership
- Business Rules
- Runtime Execution

Workspace is the working context of Matter.

Workspace never replaces Workflow.

Workspace never replaces Timeline.

Workspace never replaces AI Record.

Workspace never becomes Aggregate Root.

---

## 3. Identity

Identity：

- workspace_id

Identity Immutable.

---

## 4. Aggregate Relationship

Workspace belongs to Matter.

Workspace is not an Aggregate Root.

Matter is the only Aggregate Root.

---

## 5. Ownership

Ownership belongs to Matter.

Workspace owns no Domain Object.

Cross-Matter Ownership is prohibited.

---

## 6. Relationships

Workspace 可以引用：

- Matter
- Task
- Timeline
- Document
- Material
- Evidence
- Workflow Event
- AI Record
- Knowledge

Workspace 不拥有以上对象。

Reference does not equal Ownership.

---

## 7. Lifecycle

Workspace Lifecycle：

Created

↓

Activated

↓

Updated

↓

Archived

Matter Lifecycle 对 Workspace Lifecycle 生效。

Workspace 不负责状态迁移。

---

## 8. Workflow Relationship

Workflow 可以：

- Read Workspace
- Update Workspace View

Workspace 不驱动 Workflow。

Workspace 不拥有 Workflow。

Workspace 不定义 Workflow。

---

## 9. Database Mapping

保持官方唯一 Mapping：

Workspace

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

API 不拥有 Workspace。

API 不定义 Workspace。

---

## 11. AI Relationship

AI 可以：

- Analyze
- Suggest
- Organize
- Recommend

AI 不可以：

- Modify Workspace Ownership
- Modify Domain Object
- Modify Workflow
- Modify Matter Lifecycle

统一执行链：

Lawyer Confirms

↓

API Executes

↓

Database Updates

---

## 12. Constraints

Workspace 不得：

- 定义 Workflow
- 执行 Workflow
- 修改 Domain Object
- 拥有 Domain Object
- 替代 Timeline
- 替代 Workflow Event
- 替代 AI Record
- 定义 Runtime
- 定义 API
- 定义 Database

Today Runtime 可以展示 Workspace。

Today Runtime 不拥有 Workspace。

Today Runtime 不修改 Workspace。

---

## 13. Freeze Rules

保持与 Task 完全一致。

仅替换：

Task

↓

Workspace

---

## 14. V2 Reserved

未来可考虑：

- Personal Workspace
- Team Workspace
- Shared Workspace
- Multi-Window Workspace
- Workspace Snapshot

---

## 15. Freeze Conclusion

保持与 Task 完全一致。

仅替换：

Task

↓

Workspace
