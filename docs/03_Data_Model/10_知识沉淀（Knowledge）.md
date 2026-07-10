# 10_知识沉淀（Knowledge）

> 数据模型：知识沉淀（Knowledge）
> 所属模块：案件工作区 / 知识沉淀
> 优先级：★★★★★
> 状态：V1.0

---

# 一、对象定位

知识沉淀（Knowledge）是律师在案件办理过程中形成的可复用专业经验对象。

Knowledge 不是法律法规。

也不是裁判文书库。

Knowledge 来源于具体案件。

它代表律师经过实践验证后形成的方法、规则、经验和模板。

Knowledge 是 LawDesk 持续学习和持续成长的重要基础。

---

# 二、核心职责

Knowledge 负责：

- 保存案件经验
- 保存办案方法
- 保存裁判规则总结
- 保存风险提示
- 保存办案技巧
- 保存最佳实践
- 保存 AI 学习成果
- 支持未来案件复用

Knowledge 不负责：

- 保存案件资料
- 替代法律检索
- 替代法律文书
- 替代正式法律意见
- 替代公共法律知识库

---

# 三、业务模式

Knowledge 来源于：

案件办理

↓

案件复盘

↓

律师确认

↓

Knowledge

新的案件办理时：

AI 自动检索已有 Knowledge。

如发现可复用内容：

推荐给律师。

律师决定是否采用。

---

# 四、生命周期

Knowledge 生命周期：

创建

↓

待律师确认

↓

已确认

↓

持续复用

↓

持续优化

↓

归档

也可以：

作废

---

# 五、字段设计

## 核心字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | UUID | 是 | 自动生成 | 知识唯一 ID |
| matter_id | UUID | 否 | 无 | 来源案件 |
| knowledge_no | string | 是 | 自动生成 | 知识编号 |
| title | string | 是 | 无 | 知识标题 |
| knowledge_category | string | 是 | 办案经验（practice） | 知识类别 |
| summary | text | 否 | 无 | 知识摘要 |
| content | text | 否 | 无 | 知识内容 |
| application_scope | text | 否 | 无 | 适用范围 |
| ai_summary | text | 否 | 无 | AI 摘要 |
| ai_tags | string[] | 否 | [] | AI 标签 |
| lawyer_note | text | 否 | 无 | 律师备注 |
| reuse_count | integer | 是 | 0 | 被复用次数 |
| confirmed_by_lawyer | boolean | 是 | false | 是否确认 |
| confirmed_at | datetime | 否 | 无 | 确认时间 |
| created_at | datetime | 是 | 当前时间 | 创建时间 |
| updated_at | datetime | 是 | 当前时间 | 更新时间 |

---

# 六、知识类别设计

Knowledge 类别建议：

- 办案经验（practice）
- 裁判规则（case_rule）
- 风险提示（risk_tip）
- 办案技巧（skill）
- 文书模板经验（document_pattern）
- 庭审经验（trial_experience）
- 执行经验（enforcement_experience）
- AI 提示词（prompt）
- 其他（other）

---

# 七、状态设计

Knowledge 状态固定为：

- 待律师确认（waiting_review）
- 已确认（confirmed）
- 已归档（archived）
- 作废（void）

---

# 八、关系设计

Knowledge 可以关联：

- 一个来源案件（Matter）
- 一个或多个法律检索（Research）
- 一个或多个法律文书（Document）
- 一个或多个正式证据（Evidence）
- 一个 AI 工作记录（AI_Work_Record）

Knowledge 是未来案件的重要参考对象。

---

# 九、AI 参与规则

AI 可以：

- 自动生成知识草稿
- 自动总结办案经验
- 自动总结裁判规则
- 自动总结风险提示
- 自动建立标签
- 自动推荐历史经验
- 自动推荐最佳实践

AI 不可以：

- 自动形成正式知识
- 自动修改律师确认内容
- 自动删除知识
- 自动决定是否复用

所有正式 Knowledge 必须律师确认。

---

# 十、今日工作台支持

Today 工作台可显示：

- 新产生的知识
- 待确认知识
- 推荐复用知识
- 高频使用知识
- AI 推荐最佳实践

示例：

今日推荐：

《民间借贷案件利息抗辩》

已复用：

12 次。

---

# 十一、Workflow关联

| Workflow | 与知识沉淀的关系 |
|---|---|
| WF-005_法律检索 | 提供法律研究成果 |
| WF-006_法律论证 | 提供论证经验 |
| WF-007_法律文书 | 提供文书经验 |
| WF-008_庭审准备 | 提供庭审经验 |
| WF-011_结案归档 | 整理案件成果 |
| WF-012_案件复盘 | 核心 Workflow，形成 Knowledge |
| WF-013_知识沉淀 | 保存和复用 Knowledge |

---

# 十二、索引建议

建议建立索引：

- matter_id
- knowledge_no
- knowledge_category
- reuse_count
- confirmed_by_lawyer
- created_at
- updated_at

---

# 十三、权限与安全

Knowledge 属于律师长期专业资产。

原则：

- 默认仅律师本人可见
- AI 不得外发知识内容
- 所有知识修改可追溯
- 删除知识必须律师确认
- AI 推荐必须保留来源记录

---

# 十四、设计原则

1. Knowledge 来源于真实案件，而不是公共资料。

2. Knowledge 是经过律师确认后的可复用专业经验。

3. AI 可以总结经验，但不能确认经验。

4. Knowledge 服务于未来案件，而不是当前案件。

5. Knowledge 可以被 AI 自动推荐，但是否采用由律师决定。

6. Knowledge 是 LawDesk 持续成长的重要基础。

7. Knowledge 与 Matter、Research、Document 保持关联。

8. LawDesk 越使用，Knowledge 越丰富，AI 能力越强。