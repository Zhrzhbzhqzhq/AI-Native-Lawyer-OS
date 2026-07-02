---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Workflow Principles
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 01_workflow_principles

## 1. Workflow Purpose

Workflow 是 LawDesk 驱动案件办理和业务状态流转的核心机制。

它定义：

- 案件如何推进
- 状态如何变化
- AI 何时介入
- 律师何时确认
- Today 如何生成任务

## 2. Core Principles

- Workflow Driven
- Matter Centered
- Human in the Loop
- AI Suggests, Lawyer Confirms
- API Executes
- Database Records Truth
- Today Reflects Workflow

## 3. Workflow and Matter

所有 Workflow 最终都归属于 Matter。

Matter 是 Workflow 的业务根对象。

## 4. Workflow and API

API 不自行决定业务状态。

API 根据 Workflow 校验后执行状态变化。

非法状态转换返回：

BUSINESS_RULE_VIOLATION

## 5. Workflow and AI

AI 可以：

- 分析状态
- 推荐下一步
- 生成任务
- 发现风险
- 提醒律师

AI 不可以：

- 自动确认
- 自动提交
- 自动删除
- 自动跳过 Workflow

## 6. Workflow and Today

Today 读取 Workflow 状态，生成：

- 今日任务
- 风险提醒
- 下一步建议
- 超期提醒
- 待确认 AI 成果

## 7. Workflow and Database

Database 保存 Workflow 结果。

Database 不负责决定状态流转。

## 8. Workflow Source of Truth

- Workflow 是业务状态流转的唯一规则来源。
- API 负责执行 Workflow。
- Database 保存 Workflow 执行后的业务结果。
- AI 负责提出 Workflow 建议。
- Frontend 展示 Workflow 当前状态。
- 任何组件不得绕过 Workflow 修改业务状态。

## 9. Workflow Events

- 每一次 Workflow 状态变化都应产生对应 Workflow Event。
- Workflow Event 可驱动：
  - Timeline
  - Today
  - AI Runtime
  - Audit（V2）
  - Notification（V2）
- Workflow Event 不直接修改业务对象。
- 正式业务对象仍通过 API 更新。
- Database 始终保存 Workflow 执行后的最终业务状态（Source of Truth）。

## 10. Workflow Consistency

- 所有业务对象必须遵循所属 Workflow。
- 不得出现：
  - 状态回退
  - 非法跳阶段
  - 并发导致状态不一致
- Workflow 是 LawDesk 唯一业务状态机。

## 11. Workflow Freeze Rules

V1 Workflow ID 已冻结。

Workflow ID 永久唯一。

WF-001 至 WF-013 不得重编号。

已发布 Workflow 不得删除。

已发布 Workflow 不得复用编号。

新增 Workflow 必须使用新的连续编号（例如 WF-014、WF-015）。

## 12. V2 Reserved

V2 再考虑：

- 可视化 Workflow Builder
- 自定义 Workflow
- 团队审批流
- 多角色协同
- 自动法院节点同步

## 13. Freeze Conclusion

该文档定义 LawDesk V1 Workflow 总原则。

Workflow 是 LawDesk V1 唯一的业务状态流转规范。

Database、API、AI Runtime、Frontend 必须遵守本规范。
