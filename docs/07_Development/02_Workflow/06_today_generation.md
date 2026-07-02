---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Today Generation
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 06_today_generation

## 1. Purpose

Today Generation 定义 LawDesk 如何根据 Workflow 自动生成律师今日工作。

Today 不是业务对象。

Today 是 Workflow Runtime 的工作视图（Runtime View）。

Today Generation 是 Workflow Runtime 的唯一生成规范。

Today 用于帮助律师了解：

- 今天需要完成什么
- 今天有哪些风险
- 今天 AI 已完成什么
- 今天下一步应该做什么

Today 不保存业务状态。

Today 根据 Workflow、Task、Timeline、Deadline 等运行时数据动态生成。

---

## 2. Today Principles

统一原则：

- Workflow Driven
- Matter Centered
- Runtime Generated
- Human First
- AI Assisted
- Read Model
- Source of Truth Preserved

Today 不保存业务数据。

Database 始终保存最终业务状态（Source of Truth）。

---

## 3. Generation Sources

Today 至少读取：

- Workflow
- Lifecycle
- Tasks
- Timeline
- Deadlines
- AI Suggestions
- AI Work Records
- Calendar（V2）

Generation Sources 定义 Today Runtime 的最小数据来源。

Today Runtime 不直接修改以上对象。

---

## 4. Generation Rules

Today 自动生成：

- Today's Tasks
- Today's Deadlines
- Today's Risks
- AI Pending Review
- Next Actions
- Recommended Priorities

Today 所有内容均来自 Workflow Runtime。

---

## 5. Priority Rules

Today 应按照统一优先级排序：

Priority 1

- 今日截止事项
- 法律期限
- 法院事项

Priority 2

- Workflow 下一步
- AI 待确认成果

Priority 3

- 普通任务
- 日常整理

Priority 4

- 学习
- 知识沉淀

Priority Rule 不修改业务状态。

---

## 6. Refresh Rules

Today 应自动刷新。

刷新来源包括：

- Workflow Event
- Task Update
- Timeline Update
- Deadline Update
- Matter Update
- AI Runtime Update

Today 不主动触发 Workflow。

Today Runtime 不保存业务状态。

Database 始终保存最终业务状态（Source of Truth）。

---

## 7. Today and Workflow

Today 完全由 Workflow 驱动。

Workflow 决定：

- 当前阶段
- 下一步
- 风险
- 今日重点

Today 不决定 Workflow。

---

## 8. Today and AI Runtime

AI 可以：

- Analyze
- Suggest
- Draft
- Summarize
- Prioritize

AI 不可以：

- Confirm
- Submit
- Archive
- Bypass Workflow

AI 所有建议均需律师确认。

所有 AI 建议最终由律师确认，并通过 API 执行。

AI Suggests

↓

Lawyer Confirms

↓

API Executes

---

## 9. Today Constraints

Today：

不得：

- 保存业务状态
- 修改 Workflow
- 修改 Matter
- 修改 Lifecycle

Today 属于 Runtime View。

Database 始终保存最终业务状态（Source of Truth）。

---

## 10. Freeze Rules

V1 Today Generation 已冻结。

Today Generation 顺序不得修改。

Today Runtime 不得绕过 Workflow。

已发布 Today Generation Rule 语义不得修改。

新增 Today Generation Rule 属于 V2。

---

## 11. V2 Reserved

未来可考虑：

- Personal Schedule Integration
- Calendar Synchronization
- Smart Focus Mode
- AI Daily Planning
- Team Today
- Cross-Device Runtime

---

## 12. Freeze Conclusion

该文档定义 LawDesk V1 Today Generation 官方规范。

Today Generation 是 Workflow Runtime 的唯一生成规范。

本规范自 V1 起正式冻结。

Database、API、Workflow、AI Runtime、Frontend 及所有 V1 实现必须遵守本规范。

任何 Today Generation 规则修改必须进入 V2。
