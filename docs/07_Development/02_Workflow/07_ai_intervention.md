---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: AI Intervention
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 07_ai_intervention

## 1. Purpose

AI Intervention 定义 AI 在 LawDesk Workflow 中的统一介入规范。

AI Intervention 描述：

- AI 可以何时介入
- AI 可以执行哪些工作
- AI 不得执行哪些工作
- AI 如何与 Workflow、API、Today、Database 协作

AI Intervention 是 Workflow Runtime 的唯一 AI 介入规范。

---

## 2. AI Principles

统一原则：

- Workflow Driven
- Matter Centered
- Human in the Loop
- AI Suggests
- Lawyer Confirms
- API Executes
- Database Records Truth
- Today Reflects Workflow

AI 不直接修改业务状态。

Database 始终保存最终业务状态（Source of Truth）。

AI 属于 Workflow Runtime。

---

## 3. Intervention Points

AI 可在以下节点介入：

- Matter Created
- Workflow Started
- Workflow Event
- Task Created
- Task Updated
- Timeline Updated
- Deadline Updated
- Today Generated
- Lawyer Request

Intervention Points 定义 AI Runtime 可以合法介入 Workflow 的最小集合。

新增 AI Intervention Point 属于 V2。

---

## 4. AI Responsibilities

AI 可以：

- Analyze
- Suggest
- Draft
- Review
- Organize
- Prioritize
- Summarize
- Identify Risks
- Recommend Next Actions

AI 所有输出均属于建议，不直接产生业务状态。

AI Responsibilities 不负责业务状态修改，仅负责辅助律师完成 Workflow。

---

## 5. Human Confirmation

所有 AI 建议必须经过律师确认。

统一执行流程：

AI Suggests

↓

Lawyer Confirms

↓

API Executes

↓

Database Updates

↓

Workflow Event

↓

Timeline

↓

Today

AI 不得绕过律师确认。

---

## 6. AI Prohibited Actions

AI 不可以：

- Confirm
- Submit
- Archive
- Delete
- Change Workflow State
- Modify Lifecycle
- Bypass Workflow
- Bypass Validation
- Bypass API

任何禁止行为均属于业务规则违规。

---

## 7. AI and Workflow

Workflow 决定 AI 可以介入的时机。

AI 不决定 Workflow。

Workflow 始终是业务状态流转的唯一规则来源。

---

## 8. AI and Today

Today 可以展示：

- AI Suggestions
- AI Drafts
- AI Risks
- AI Pending Review
- AI Recommended Priorities

Today 不自动执行 AI 建议。

---

## 9. AI and Database

AI 不直接写入 Database。

所有业务数据必须通过 API 更新。

Database 始终保存最终业务状态（Source of Truth）。

---

## 10. AI Constraints

AI：

不得：

- 修改业务状态
- 修改 Workflow
- 修改 Matter
- 修改 Lifecycle
- 修改 Database
- 绕过 Workflow
- 绕过 Validation
- 绕过 API

AI 属于 Workflow Runtime。

---

## 11. Freeze Rules

V1 AI Intervention 已冻结。

AI Intervention 顺序不得修改。

AI Intervention Point 不得删除。

AI Runtime 不得绕过 Workflow。

已发布 AI Intervention Rule 语义不得修改。

新增 AI Intervention Rule 属于 V2。

---

## 12. V2 Reserved

未来可考虑：

- Autonomous Agent
- Multi-Agent Collaboration
- Team AI
- AI Approval Policies
- AI Plugin Framework
- External AI Integration

---

## 13. Freeze Conclusion

该文档定义 LawDesk V1 AI Intervention 官方规范。

AI Intervention 是 Workflow Runtime 的唯一 AI 介入规范。

本规范自 V1 起正式冻结。

Database、API、Workflow、AI Runtime、Frontend 及所有 V1 实现必须遵守本规范。

任何 AI Intervention 规则修改必须进入 V2。
