# 05_证据（Evidence）

> 数据模型：证据（Evidence）
> 所属模块：案件工作区 / 证据管理
> 优先级：★★★★★
> 状态：V1.0

---

# 一、对象定位

证据（Evidence）是律师确认后的正式证据对象。

Evidence 不等于 Material（案件资料）。

Material 是原始资料。

Evidence 是律师依据法律规则，从案件资料中确认并形成的正式证据。

只有进入 Evidence 的对象，才能进入：

- 法律检索
- 法律论证
- 法律文书
- 庭审准备
- 举证质证

---

# 二、核心职责

Evidence 负责：

- 保存正式证据
- 建立证据目录
- 建立证明目的
- 建立证据来源
- 建立证据状态
- 建立证据之间关系
- 支持 AI 分析证明力
- 支持庭审举证

Evidence 不负责：

- 保存原始资料
- 替代 Material
- 替代法律文书
- 替代法律检索
- 替代律师判断

---

# 三、业务模式

Evidence 来源于 Material。

流程：

Material

↓

AI 推荐候选证据

↓

律师审核

↓

确认进入 Evidence

↓

参与案件办理

Evidence 一旦建立，将成为案件正式证据。

律师可以：

- 修改
- 删除
- 合并
- 拆分

所有正式操作必须律师确认。

---

# 四、生命周期

Evidence 生命周期：

候选证据

↓

待律师确认

↓

正式证据

↓

举证中

↓

质证中

↓

已采信

↓

未采信

↓

已归档

---

# 五、字段设计

## 核心字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | UUID | 是 | 自动生成 | 证据唯一 ID |
| matter_id | UUID | 是 | 无 | 所属案件 |
| evidence_no | string | 是 | 自动生成 | 证据编号 |
| title | string | 是 | 无 | 证据名称 |
| evidence_category | string | 是 | 其他（other） | 证据类别 |
| primary_material_id | UUID | 否 | 无 | 主要来源资料 ID |
| purpose | text | 否 | 无 | 证明目的 |
| source_description | text | 否 | 无 | 证据来源说明 |
| status | string | 是 | 候选证据（candidate） | 当前状态 |
| importance | string | 否 | 中（medium） | 重要程度 |
| credibility | string | 否 | 未评估（unknown） | 可信度 |
| ai_summary | text | 否 | 无 | AI 摘要 |
| ai_analysis | text | 否 | 无 | AI 分析 |
| ai_risk_tip | text | 否 | 无 | AI 风险提示 |
| lawyer_note | text | 否 | 无 | 律师备注 |
| confirmed_by_lawyer | boolean | 是 | false | 是否确认 |
| confirmed_at | datetime | 否 | 无 | 确认时间 |
| created_at | datetime | 是 | 当前时间 | 创建时间 |
| updated_at | datetime | 是 | 当前时间 | 更新时间 |

---

# 六、证据类别设计

Evidence 类别建议：

- 书证（document）
- 物证（physical）
- 证人证言（witness）
- 当事人陈述（statement）
- 电子数据（electronic）
- 视听资料（audio_video）
- 鉴定意见（expert_opinion）
- 勘验笔录（inspection）
- 其他（other）

---

# 七、状态设计

Evidence 状态：

- 候选证据（candidate）
- 待律师确认（waiting_review）
- 正式证据（confirmed）
- 举证中（submitted）
- 质证中（cross_examined）
- 已采信（accepted）
- 未采信（rejected）
- 已归档（archived）

---

# 八、关系设计

Evidence 可以关联：

- 一个案件（Matter）
- 一个或多个案件资料（Material）
- 一个或多个法律文书（Document）
- 一个或多个时间轴节点（Timeline）
- 一个或多个 AI 工作记录（AI_Work_Record）

推荐关系实体：

- MaterialEvidence
- EvidenceDocument
- EvidenceTimeline

---

# 九、AI 参与规则

AI 可以：

- 推荐候选证据
- 自动分类
- 分析证明目的
- 分析证明力
- 分析证据链完整性
- 提示缺失证据
- 发现证据冲突
- 生成证据摘要

AI 不可以：

- 自动认定正式证据
- 自动删除证据
- 自动修改律师确认内容
- 自动决定举证顺序
- 自动向法院提交证据

所有正式证据必须律师确认。

---

# 十、今日工作台支持

今日工作台可显示：

- 待确认候选证据
- 缺失证据提醒
- 证据冲突提醒
- 举证期限提醒
- 质证准备提醒
- AI 建议补强证据

示例：

证据完整度：

78%

候选证据：

4 项

缺失：

借款流水

AI 建议：

补充银行流水。

---

# 十一、Workflow关联

| Workflow | 与证据的关系 |
|---|---|
| WF-003_资料整理 | Material 进入候选证据 |
| WF-004_证据管理 | 建立正式 Evidence |
| WF-005_法律检索 | 基于 Evidence 检索法律依据 |
| WF-006_法律论证 | 基于 Evidence 建立法律观点 |
| WF-007_法律文书 | 引用正式证据 |
| WF-008_庭审准备 | 制定举证方案 |
| WF-009_开庭与庭后 | 举证、质证 |
| WF-011_结案归档 | 归档证据 |
| WF-012_案件复盘 | 分析证据体系 |
| WF-013_知识沉淀 | 提炼证据经验 |

---

# 十二、索引建议

建议建立索引：

- matter_id
- evidence_no
- title
- evidence_category
- status
- importance
- confirmed_by_lawyer
- created_at
- updated_at

---

# 十三、权限与安全

证据属于案件核心资产。

原则：

- 默认本地存储
- AI 不得擅自外发证据
- 所有修改可追溯
- 删除证据必须律师确认
- 正式证据不得被 AI 自动覆盖

---

# 十四、设计原则

1. Evidence 是正式证据，不是原始资料。

2. 所有 Evidence 均来源于 Material。

3. 是否成为正式证据必须律师确认。

4. AI 可以推荐证据，但不能确认法律效力。

5. Evidence 是法律检索、法律论证和法律文书的核心依据。

6. Evidence 必须保留来源关系。

7. 今日工作台根据 Evidence 状态持续推动律师完成举证工作。

8. Evidence 是案件证据体系的核心对象。