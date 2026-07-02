# 02_matter_lifecycle

## 1. Lifecycle Purpose

Matter Lifecycle 定义案件在 LawDesk 中的业务状态演进。

它将 Workflow 与 API、Database、AI、Today 以及律师确认紧密连接，保证案件从咨询到归档的状态流转可控、可审计、可遵循。

## 2. Lifecycle Principles

- Workflow Driven
- Matter Centered
- Human in the Loop
- AI Suggests
- Lawyer Confirms
- API Executes
- Database Records Truth
- Today Reflects Lifecycle

Matter Lifecycle 以 Workflow 为核心，围绕 Matter 组织业务状态流转。AI 提出建议，律师确认执行，API 落地操作，Database 记录结果，Today 反映当前状态。

## 3. Lifecycle States

consultation
↓

accepted
↓

active
↓

closing
↓

closed
↓

archived

## 4. State Definitions

consultation

- 业务意义：案件处于咨询阶段，尚未正式接案。
- AI 行为：分析材料、推荐接案建议、发现风险、提示律师补充信息。
- 律师责任：评估案情、决定是否接案、收集基本客户信息。

accepted

- 业务意义：案件已正式接案，但尚未进入正式办理阶段。
- AI 行为：建议初始办理计划、提示下一步动作、预判关键期限。
- 律师责任：确认案件接收，补录必要客户与案情信息，准备进入办理阶段。

active

- 业务意义：案件进入正式办理阶段，核心业务推进开始。
- AI 行为：生成任务、整理材料、更新风险提示、辅助办案计划。
- 律师责任：执行案件推进工作、审核 AI 建议、监督进度与质量。

closing

- 业务意义：案件进入结案收尾阶段，准备关闭与归档。
- AI 行为：整理结案材料、总结关键节点、提示结案风险。
- 律师责任：确认结案条件、完成结案手续、准备结案文件。

closed

- 业务意义：案件已结案，业务执行完成，进入结案状态。
- AI 行为：生成复盘建议、归纳经验、提示知识沉淀机会。
- 律师责任：确认结案完成、启动复盘与知识提炼。

archived

- 业务意义：案件已归档，进入只读历史状态。
- AI 行为：提供历史检索、知识关联、案例复用建议。
- 律师责任：查阅历史案件、复用结案知识，不再修改归档案件。

## 5. State Entry Conditions

consultation

- 新增 Matter 时默认进入 consultation。
- 该状态可以由系统创建或人工录入。

accepted

进入条件：

- Workflow 校验通过。
- 律师确认接案。
- Matter 已创建。
- 满足 Client 关联规则。

active

- 必须经过 Workflow 校验，将案件从 accepted 推进到正式办理阶段。
- 可以触发开始时间、任务与 Today 初始化。

closing

- 必须经过 Workflow 校验，将案件推进到结案准备阶段。
- 应具备当事人、证据、程序等结案条件的初步确认。

closed

- 必须经过 Workflow 校验，确认结案完成。
- 可能触发结案时间、后续复盘与知识沉淀。

archived

- 必须经过 Workflow 校验，将已结案 Matter 归档。
- 归档前应检查未完成任务与状态。

## 6. State Exit Conditions

consultation

- 进入 accepted 时退出 consultation。
- 在正式接案前可放弃或归档（Archive），遵循 Workflow 与业务规则。

accepted

- 进入 active 时退出 accepted。
- 不直接回退到 consultation。

active

- 进入 closing 时退出 active。
- 不直接回退到 accepted。

closing

- 进入 closed 时退出 closing。
- 不直接回退到 active。

closed

- 进入 archived 时退出 closed。
- 不允许直接返回到任何前置状态。

archived

- 归档后保持只读，不再进入其他生命周期状态。

## 7. State Transition Rules

合法状态流转（Legal Transitions）

- consultation → accepted
- accepted → active
- active → closing
- closing → closed
- closed → archived

非法状态流转（Illegal Transitions）

- consultation → active
- consultation → closing
- consultation → closed
- consultation → archived
- accepted → closing
- accepted → closed
- accepted → archived
- active → closed
- active → archived
- closing → archived（未满足结案条件）
- closed → active
- closed → closing
- archived → 任何状态

非法状态流转返回：

BUSINESS_RULE_VIOLATION

## 8. Lifecycle Events

Lifecycle Events 描述 Matter 在状态变化时发生的关键业务事件。

- 每一次 Lifecycle 状态变化都应产生对应事件。
- Lifecycle Events 可驱动：
  - Timeline
  - Today
  - AI Runtime
- Lifecycle Events 不直接修改业务对象。
- 正式业务对象仍通过 API 更新。
- Database 始终保存 Lifecycle 执行后的最终业务状态（Source of Truth）。

## 9. Lifecycle and Workflow

Lifecycle 由 Workflow 驱动。

Workflow 定义合法状态流转规则，Lifecycle 反映 Matter 的业务状态演进。

## 10. Lifecycle and Today

Today 读取 Lifecycle 状态，生成：

- 今日任务
- 风险提醒
- 下一步建议
- 超期提醒
- 待确认 AI 成果

## 11. Lifecycle and AI

AI 可以：

- analyze
- suggest
- remind

AI 不可以：

- confirm
- submit
- archive
- bypass Workflow

## 12. Lifecycle and Database

Database 保存 Lifecycle 执行后的最终业务状态。

Database 是最终业务数据来源（Source of Truth）。

## 13. Lifecycle Constraints

- Matter 不得跳过 Lifecycle 状态。
- Archived Matter 为只读状态。
- Closed Matter 只能进入 Archived。
- Consultation 可在正式接案前放弃或归档（Archive）。
- Lifecycle 状态变更必须通过 Workflow 校验。

## 14. Lifecycle Freeze Rules

V1 Matter Lifecycle 已冻结。

Lifecycle 顺序不得修改。

新增 Lifecycle 状态属于 V2。

## 15. V2 Reserved

未来可考虑：

- 可视化 Lifecycle Builder
- 自定义 Lifecycle
- 团队审批流
- 多角色协同

## 16. Freeze Conclusion

该文档定义 LawDesk V1 Matter Lifecycle 官方规范。

本规范自 V1 起正式冻结。

Database、API、Workflow、AI Runtime、Frontend 及后续 V1 功能开发必须遵守本规范。

任何业务规则修改必须进入 V2。