# 09_法律检索（Research）

> 数据模型：法律检索（Research）
> 所属模块：案件工作区 / 法律检索
> 优先级：★★★★★
> 状态：V1.0

---

# 一、对象定位

法律检索（Research）是律师围绕案件争议焦点形成的法律研究成果对象。

Research 不是搜索历史。

也不是浏览记录。

Research 是经过 AI 与律师共同整理后的正式法律检索成果。

Research 可以直接支撑：

- 法律论证
- 法律文书
- 庭审准备
- 案件复盘
- 知识沉淀

---

# 二、核心职责

Research 负责：

- 保存法律检索成果
- 记录检索问题
- 保存法律依据
- 保存裁判规则
- 保存类案结论
- 保存 AI 分析结果
- 建立案件关联
- 支持文书引用

Research 不负责：

- 保存案件资料
- 替代 Evidence
- 替代法律文书
- 替代知识库
- 替代律师最终法律意见

---

# 三、业务模式

Research 来源于：

案件事实

↓

正式证据

↓

律师提出法律问题

↓

AI 法律检索

↓

律师确认

↓

Research

Research 可以不断补充。

但所有正式检索成果必须律师确认。

---

# 四、生命周期

Research 生命周期：

创建

↓

AI检索中

↓

待律师审核

↓

已确认

↓

已引用

↓

已归档

也可以：

作废

---

# 五、字段设计

## 核心字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | UUID | 是 | 自动生成 | 检索成果 ID |
| matter_id | UUID | 是 | 无 | 所属案件 |
| research_no | string | 是 | 自动生成 | 检索编号 |
| title | string | 是 | 无 | 检索标题 |
| research_category | string | 是 | 法律问题（legal_issue） | 检索类别 |
| legal_question | text | 是 | 无 | 检索问题 |
| legal_basis | text | 否 | 无 | 法律依据 |
| case_rules | text | 否 | 无 | 裁判规则 |
| case_summary | text | 否 | 无 | 类案总结 |
| ai_summary | text | 否 | 无 | AI 检索摘要 |
| ai_analysis | text | 否 | 无 | AI 法律分析 |
| ai_risk_tip | text | 否 | 无 | AI 风险提示 |
| lawyer_conclusion | text | 否 | 无 | 律师结论 |
| status | string | 是 | 待律师审核（waiting_review） | 当前状态 |
| confirmed_by_lawyer | boolean | 是 | false | 是否确认 |
| confirmed_at | datetime | 否 | 无 | 确认时间 |
| created_at | datetime | 是 | 当前时间 | 创建时间 |
| updated_at | datetime | 是 | 当前时间 | 更新时间 |

---

# 六、检索类别设计

Research 类别建议：

- 法律问题（legal_issue）
- 法律法规（statute）
- 司法解释（judicial_interpretation）
- 裁判规则（case_rule）
- 类案检索（similar_case）
- 程序问题（procedure）
- 执行问题（enforcement）
- 其他（other）

---

# 七、状态设计

Research 状态固定为：

- AI检索中（researching）
- 待律师审核（waiting_review）
- 已确认（confirmed）
- 已引用（referenced）
- 已归档（archived）
- 作废（void）

---

# 八、关系设计

Research 可以关联：

- 一个案件（Matter）
- 一个或多个正式证据（Evidence）
- 一个或多个法律文书（Document）
- 一个 AI 工作记录（AI_Work_Record）

Research 是法律论证的重要基础。

---

# 九、AI 参与规则

AI 可以：

- 自动法律检索
- 自动检索法条
- 自动检索司法解释
- 自动检索类案
- 自动总结裁判规则
- 自动形成法律分析
- 自动发现争议焦点
- 自动提示法律风险

AI 不可以：

- 自动形成正式法律意见
- 自动确认检索成果
- 自动删除检索成果
- 自动代表律师作出法律判断

所有正式检索成果必须律师确认。

---

# 十、今日工作台支持

Today 工作台可显示：

- 待完成法律检索
- AI 检索建议
- 待审核检索成果
- 新增争议焦点
- 新发现裁判规则

示例：

今日建议：

完成

《民间借贷利息计算》

法律检索。

---

# 十一、Workflow关联

| Workflow | 与法律检索的关系 |
|---|---|
| WF-004_证据管理 | 根据正式证据提出法律问题 |
| WF-005_法律检索 | 核心 Workflow，形成 Research |
| WF-006_法律论证 | 使用检索成果建立法律观点 |
| WF-007_法律文书 | 引用检索成果 |
| WF-008_庭审准备 | 引用裁判规则 |
| WF-011_结案归档 | 保存检索成果 |
| WF-012_案件复盘 | 复盘检索质量 |
| WF-013_知识沉淀 | 转入知识库 |

---

# 十二、索引建议

建议建立索引：

- matter_id
- research_no
- research_category
- status
- confirmed_by_lawyer
- created_at
- updated_at

---

# 十三、权限与安全

Research 属于律师专业成果。

原则：

- 所有检索成果可追溯
- AI 不得擅自修改律师确认内容
- AI 不得自动形成正式法律意见
- 所有 AI 检索过程必须记录

---

# 十四、设计原则

1. Research 是法律检索成果，不是搜索历史。

2. AI 可以完成法律检索，但律师负责最终法律判断。

3. Research 必须建立在案件事实和正式证据基础上。

4. Research 是法律论证的重要输入。

5. Research 可以被法律文书直接引用。

6. Today 根据案件进展推动法律检索。

7. 检索成果可以沉淀进入 Knowledge。

8. Research 是 LawDesk 法律专业能力的重要体现。