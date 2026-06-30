# Timeline（案件时间轴）数据模型

## 一、定义

Timeline 是案件中的时间轴对象。

它用于记录案件事实发生顺序、程序节点、法院节点、律师工作节点和关键期限。

AI Native Lawyer OS 需要通过 Timeline 帮助律师理解案件脉络、发现时间矛盾、提醒关键期限，并推动案件进展。

## 二、基本字段

| 字段 | 含义 | 示例 |
|---|---|---|
| timeline_id | 时间轴编号 | T-2026-0001 |
| matter_id | 关联案件编号 | 2026-0001 |
| event_date | 事件日期 | 2026-07-05 |
| event_time | 事件时间 | 10:30 |
| event_type | 事件类型 | 事实事件 / 程序事件 / 律师工作 / 法院节点 / 期限节点 |
| event_title | 事件标题 | 客户向对方转账10万元 |
| event_description | 事件说明 | 张三通过银行转账向李四支付借款10万元 |
| related_party | 关联主体 | 张三、李四 |
| related_evidence | 关联证据 | 银行转账记录 |
| related_document | 关联文书 | 起诉状 |
| importance | 重要程度 | 高 / 中 / 低 |
| risk_level | 风险等级 | 红 / 黄 / 绿 |
| ai_summary | AI摘要 | 该事件是证明借款交付的核心事实 |
| lawyer_note | 律师备注 | 需核对银行流水原件 |

## 三、事件类型

V1 支持以下事件类型：

1. 事实事件
2. 咨询事件
3. 证据事件
4. 律师工作事件
5. 法院/仲裁程序事件
6. 开庭事件
7. 调解事件
8. 判决/裁定事件
9. 执行事件
10. 期限节点
11. 回款事件
12. 归档事件

## 四、时间轴状态

| 状态 | 说明 |
|---|---|
| 待确认 | AI 提取后等待律师确认 |
| 已确认 | 律师确认后进入正式时间轴 |
| 有疑点 | 时间、主体、金额或事实存在疑点 |
| 需补充 | 缺少证据或说明 |
| 已归档 | 案件结束后进入归档 |

## 五、AI 可读取内容

AI 可以读取：

- 咨询录音转文字
- 聊天记录
- 合同
- 转账记录
- 法院材料
- 律师备注
- 已有时间轴
- 证据清单
- 文书内容

## 六、AI 可生成内容

AI 可以生成：

- 事实时间轴
- 程序时间轴
- 关键期限提醒
- 时间矛盾提示
- 缺失节点提示
- 证据与时间轴关联
- 庭审事实陈述顺序
- 复盘中的案件经过

## 七、律师确认规则

以下内容必须由律师确认后正式生效：

- AI 提取的关键事件
- 时间轴中的事件日期
- 事件重要程度
- 关联证据
- 期限节点
- 程序节点
- 风险判断

AI 可以自动提取时间轴草稿，但不能直接作为正式案件时间轴。

## 八、Timeline 与 Matter 的关系

一个 Matter 可以包含多个 Timeline Event。

每个 Timeline Event 必须关联一个 Matter。

Timeline 可以关联：

- Evidence：证据
- Document：文书
- Task：案件任务
- AI_Work_Record：AI 工作记录

## 九、V1 最小可用字段

第一版开发至少需要：

- timeline_id
- matter_id
- event_date
- event_type
- event_title
- event_description
- related_evidence
- importance
- risk_level
- ai_summary
- status
- created_at
- updated_at

## 十、设计原则

Timeline 不是简单日历，而是案件事实和程序推进的主线。

AI 的核心作用是帮助律师把零散材料整理成清晰时间线，并提醒关键期限和潜在矛盾。
