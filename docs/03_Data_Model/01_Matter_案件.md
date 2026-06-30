# Matter（案件）数据模型

## 一、定义

Matter 是 AI Native Lawyer OS 的核心对象。

系统所有资料、任务、文书、证据、时间轴、AI 分析、风险提醒、复盘总结，均围绕 Matter 组织。

## 二、基本字段

| 字段 | 含义 | 示例 |
|---|---|---|
| matter_id | 案件编号 | 2026-0001 |
| matter_name | 案件名称 | 张三诉李四民间借贷纠纷 |
| matter_type | 案由/类型 | 民间借贷纠纷 |
| client_name | 客户名称 | 张三 |
| opponent_name | 对方当事人 | 李四 |
| court | 法院/机构 | 北京市朝阳区人民法院 |
| stage | 当前阶段 | 咨询中 / 待立案 / 审理中 / 待开庭 / 执行中 / 已结案 |
| status | 当前状态 | 正常 / 需处理 / 有风险 / 已暂停 |
| open_date | 收案日期 | 2026-06-30 |
| close_date | 结案日期 | 2026-12-20 |
| next_action | 下一步动作 | 准备立案材料 |
| next_deadline | 下一节点日期 | 2026-07-05 |
| priority | 优先级 | 高 / 中 / 低 |
| risk_level | 风险等级 | 红 / 黄 / 绿 |
| ai_summary | AI 案件摘要 | 本案核心争议为借款事实及还款情况 |
| lawyer_note | 律师备注 | 客户需补充转账记录 |

## 三、案件阶段

V1 阶段不宜复杂，先保留以下状态：

1. 新咨询
2. 待接案
3. 待立案
4. 办理中
5. 待开庭
6. 执行中
7. 已结案
8. 已归档
9. 已放弃

## 四、案件状态

| 状态 | 说明 |
|---|---|
| 正常 | 当前无明显风险 |
| 需处理 | 有待办事项 |
| 有风险 | 存在期限、证据、程序或策略风险 |
| 等待中 | 等待法院、客户或第三方反馈 |
| 已暂停 | 暂时不推进 |
| 已完成 | 已结案或归档 |

## 五、AI 可读取内容

AI 可以读取：

- 案件基本信息
- 上传资料
- 证据清单
- 时间轴
- 文书草稿
- 法律检索结果
- 律师备注
- 历史 AI 工作记录

## 六、AI 可生成内容

AI 可以生成：

- 案件摘要
- 事实梳理
- 风险提示
- 下一步建议
- 待办事项
- 文书草稿
- 证据分析
- 检索建议
- 复盘报告

## 七、律师确认规则

以下内容必须由律师确认后才能正式写入案件：

- 接案决定
- 案件正式创建
- 正式文书
- 证据目录
- 法律意见
- 提交法院材料
- 结案归档
- 复盘结论

## 八、Matter 与其他对象关系

Matter 关联：

- Client：客户
- Evidence：证据
- Document：文书
- Timeline：时间轴
- Task：案件任务
- Knowledge：知识沉淀
- AI_Work_Record：AI 工作记录

## 九、V1 最小可用字段

第一版开发时，Matter 至少需要以下字段：

- matter_id
- matter_name
- client_name
- matter_type
- stage
- status
- next_action
- next_deadline
- priority
- risk_level
- ai_summary
- created_at
- updated_at

## 十、设计原则

Matter 不只是案件信息表，而是整个案件的运行中心。

LawDesk 的所有页面、提醒、AI 工作和案件推进，都必须从 Matter 出发，并最终回到 Matter。
