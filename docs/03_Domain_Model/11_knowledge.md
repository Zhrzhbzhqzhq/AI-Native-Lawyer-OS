# Knowledge（知识沉淀）数据模型

## 一、定义

Knowledge 是律师在办案过程中沉淀下来的可复用经验、规则、模板和复盘结论。

AI Native Lawyer OS 不只是帮助律师完成当前案件，还要帮助律师从已办案件中总结经验、提升能力。

## 二、基本字段

| 字段 | 含义 | 示例 |
|---|---|---|
| knowledge_id | 知识编号 | K-2026-0001 |
| source_matter_id | 来源案件编号 | 2026-0001 |
| knowledge_title | 知识标题 | 民间借贷案件中转账记录的证明力 |
| knowledge_type | 知识类型 | 裁判规则 / 办案经验 / 文书模板 / 证据规则 / 风险提示 |
| practice_area | 业务领域 | 民间借贷 / 买卖合同 / 劳动争议 |
| summary | 知识摘要 | 转账记录需结合借条、聊天记录形成完整证据链 |
| content | 正文内容 | 详细总结内容 |
| source_document | 来源文书 | 判决书 / 代理词 / 复盘报告 |
| ai_generated | 是否 AI 生成 | 是 / 否 |
| lawyer_confirmed | 是否律师确认 | 是 / 否 |
| reusable_level | 复用价值 | 高 / 中 / 低 |
| tags | 标签 | 民间借贷,证据链,转账记录 |
| lawyer_note | 律师备注 | 后续同类案件可优先检查借款合意 |

## 三、知识类型

V1 支持以下类型：

1. 办案经验
2. 裁判规则
3. 证据规则
4. 文书模板
5. 检索结论
6. 风险提示
7. 庭审经验
8. 执行经验
9. 复盘结论
10. 其他

## 四、AI 可读取内容

AI 可以读取：

- 已结案件材料
- 结案报告
- 复盘报告
- 裁判文书
- 检索报告
- 律师备注
- 文书修改记录

## 五、AI 可生成内容

AI 可以生成：

- 案件复盘摘要
- 可复用裁判规则
- 可复用办案经验
- 文书模板优化建议
- 证据风险经验
- 庭审策略经验
- 同类案件提示

## 六、律师确认规则

以下内容必须律师确认后才能进入知识库：

- 裁判规则
- 办案经验
- 文书模板
- 复盘结论
- 同类案件建议

AI 可以建议沉淀，但不能自动作为正式知识入库。

## 七、Knowledge 与 Matter 的关系

Knowledge 可以来源于一个 Matter，也可以用于多个 Matter。

一个已结案件可以沉淀多个 Knowledge。

Knowledge 可以关联：

- Matter：来源案件
- Document：来源文书
- Evidence：相关证据
- AI_Work_Record：AI 总结记录

## 八、V1 最小可用字段

第一版开发至少需要：

- knowledge_id
- source_matter_id
- knowledge_title
- knowledge_type
- practice_area
- summary
- content
- ai_generated
- lawyer_confirmed
- reusable_level
- tags
- created_at
- updated_at

## 九、设计原则

Knowledge 不是资料库堆积，而是律师个人经验的沉淀。

只有经过律师确认、具有复用价值的内容，才应该进入正式知识库。
