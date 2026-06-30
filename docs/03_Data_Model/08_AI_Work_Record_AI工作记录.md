# AI_Work_Record（AI 工作记录）数据模型

## 一、定义

AI_Work_Record 用于记录 AI 在案件中的每一次工作过程和结果。

它保证 AI 的工作可追溯、可审核、可修改、可复盘。

## 二、基本字段

| 字段 | 含义 | 示例 |
|---|---|---|
| record_id | 记录编号 | AIR-2026-0001 |
| matter_id | 关联案件编号 | 2026-0001 |
| task_id | 关联任务编号 | TK-2026-0001 |
| action_type | AI动作类型 | 接案评估 / 证据分析 / 文书生成 |
| user_instruction | 律师指令 | 请根据材料生成起诉状 |
| ai_plan | AI工作计划 | 先整理事实，再生成文书草稿 |
| lawyer_approved | 律师是否同意执行 | 是 / 否 |
| ai_result | AI工作成果 | 起诉状草稿 |
| review_status | 审核状态 | 待审核 / 已修改 / 已确认 / 已退回 |
| lawyer_feedback | 律师反馈 | 诉讼请求需修改 |
| final_status | 最终状态 | 未生效 / 已生效 / 已归档 |
| created_at | 创建时间 | 2026-06-30 13:30 |
| updated_at | 更新时间 | 2026-06-30 13:45 |

## 三、核心规则

AI 的重要工作必须形成记录。

记录内容包括：

- 律师发起了什么指令
- AI 准备怎么做
- 律师是否同意执行
- AI 输出了什么结果
- 律师如何审核修改
- 最终是否生效

## 四、AI 工作状态

| 状态 | 说明 |
|---|---|
| 计划中 | AI 已生成计划，等待律师确认 |
| 已授权 | 律师确认 AI 可以开始工作 |
| 执行中 | AI 正在处理 |
| 待审核 | AI 已输出成果，等待律师审核 |
| 修改中 | 律师提出反馈，AI 或律师继续修改 |
| 已确认 | 律师确认成果 |
| 已生效 | 成果写入正式案件 |
| 已退回 | 律师退回 AI 成果 |
| 已归档 | 工作记录归档 |

## 五、适用场景

V1 中以下 AI 工作必须记录：

1. 接案评估
2. 案件摘要生成
3. 证据分析
4. 法律检索整理
5. 文书生成
6. 庭审准备
7. 风险提示
8. 执行方案
9. 结案总结
10. 复盘沉淀

## 六、律师确认规则

AI_Work_Record 的核心价值是确保：

- AI 工作前，律师同意；
- AI 工作后，律师审核；
- 重要成果，律师确认后生效；
- 全流程可追溯。

## 七、V1 最小可用字段

第一版开发至少需要：

- record_id
- matter_id
- task_id
- action_type
- user_instruction
- ai_plan
- lawyer_approved
- ai_result
- review_status
- lawyer_feedback
- final_status
- created_at
- updated_at

## 八、设计原则

AI_Work_Record 不是聊天记录，而是 AI 办案工作的过程记录。

它是 AI Native Lawyer OS 保证专业性、安全性和律师控制权的重要机制。
