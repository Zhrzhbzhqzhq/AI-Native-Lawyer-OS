# 06_法律文书（Document）

> 数据模型：法律文书（Document）
> 所属模块：案件工作区 / 法律文书
> 优先级：★★★★★
> 状态：V1.0

---

# 一、对象定位

法律文书（Document）是律师在案件办理过程中形成的正式法律表达对象。

Document 不是普通文件。

Word、PDF、打印件只是 Document 的载体。

Document 代表律师围绕案件事实、正式证据、法律检索和法律论证形成的法律工作成果。

例如：

- 起诉状
- 答辩状
- 代理词
- 庭审提纲
- 证据目录
- 财产保全申请书
- 执行申请书
- 律师函
- 调解方案

---

# 二、核心职责

Document 负责：

- 保存法律文书基本信息
- 记录文书类型
- 记录文书状态
- 关联案件
- 关联正式证据
- 关联法律检索
- 关联法律论证
- 保存文书内容
- 支持 AI 生成、修改、校验
- 支持律师确认正式文书

Document 不负责：

- 保存原始案件资料
- 替代 Evidence
- 替代 Research
- 替代法律论证
- 自动提交法院
- 自动代表律师签署法律意见

---

# 三、业务模式

Document 来源于：

案件事实

↓

正式证据

↓

法律检索

↓

法律论证

↓

律师指令

AI 可以根据上述内容生成法律文书草稿。

但是：

正式文书必须经过律师审核确认。

Document 在 V1 中只保留一个当前版本。

复杂版本管理留到 V2。

---

# 四、生命周期

Document 生命周期：

草稿

↓

AI生成中

↓

待律师审核

↓

律师修改中

↓

已确认

↓

已使用

↓

已归档

也可能进入：

作废

---

# 五、字段设计

## 核心字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | UUID | 是 | 自动生成 | 文书唯一 ID |
| matter_id | UUID | 是 | 无 | 所属案件 ID |
| document_no | string | 是 | 自动生成 | 文书编号 |
| title | string | 是 | 无 | 文书标题 |
| document_category | string | 是 | 其他（other） | 文书类别 |
| status | string | 是 | 草稿（draft） | 文书状态 |
| content | text | 否 | 无 | 文书正文内容 |
| file_path | string | 否 | 无 | 导出文件路径 |
| file_name | string | 否 | 无 | 导出文件名 |
| format | string | 否 | markdown | 文书格式 |
| related_evidence_ids | UUID[] | 否 | [] | 关联证据 ID |
| related_research_ids | UUID[] | 否 | [] | 关联法律检索 ID |
| ai_summary | text | 否 | 无 | AI 文书摘要 |
| ai_review | text | 否 | 无 | AI 校验意见 |
| ai_risk_tip | text | 否 | 无 | AI 风险提示 |
| lawyer_note | text | 否 | 无 | 律师备注 |
| confirmed_by_lawyer | boolean | 是 | false | 是否经律师确认 |
| confirmed_at | datetime | 否 | 无 | 确认时间 |
| used_at | datetime | 否 | 无 | 实际使用时间 |
| archived_at | datetime | 否 | 无 | 归档时间 |
| created_at | datetime | 是 | 当前时间 | 创建时间 |
| updated_at | datetime | 是 | 当前时间 | 更新时间 |

---

# 六、文书类别设计

Document 类别建议包括：

- 起诉状（complaint）
- 答辩状（answer）
- 代理词（representation_statement）
- 庭审提纲（trial_outline）
- 证据目录（evidence_list）
- 财产保全申请书（preservation_application）
- 执行申请书（enforcement_application）
- 律师函（lawyer_letter）
- 调解方案（mediation_plan）
- 其他（other）

---

# 七、状态设计

Document 状态固定为：

- 草稿（draft）
- AI生成中（generating）
- 待律师审核（waiting_review）
- 律师修改中（lawyer_editing）
- 已确认（confirmed）
- 已使用（used）
- 已归档（archived）
- 作废（void）

---

# 八、关系设计

Document 可以关联：

- 一个案件（Matter）
- 一个或多个正式证据（Evidence）
- 一个或多个案件资料（Material）
- 一个或多个法律检索结果（Research）
- 一个或多个时间轴节点（Timeline）
- 一个或多个 AI 工作记录（AI_Work_Record）

推荐关系实体：

- `DocumentEvidence`：`document_id`, `evidence_id`, `relation_type`
- `DocumentMaterial`：`document_id`, `material_id`, `relation_type`
- `DocumentResearch`：`document_id`, `research_id`, `relation_type`
- `DocumentTimeline`：`document_id`, `timeline_id`, `relation_type`

---

# 九、AI 参与规则

AI 可以：

- 根据案件事实生成文书草稿
- 引用正式证据
- 引用法律检索结果
- 引用法律论证
- 检查文书逻辑
- 检查证据引用
- 检查法律依据引用
- 提示风险
- 润色文书
- 生成修改建议

AI 不可以：

- 自动确认正式文书
- 自动提交法院
- 自动发送给客户或第三方
- 自动覆盖律师确认版本
- 自动签署法律意见

所有正式文书必须律师确认。

---

# 十、今日工作台支持

今日工作台可显示：

- 待生成文书
- 待审核文书
- 待修改文书
- 文书风险提醒
- 文书提交期限
- AI 建议更新文书

示例：

张三诉李四民间借贷纠纷

待审核文书：

民事起诉状

AI 风险提示：

第三项诉讼请求缺少法律依据。

建议：

进入法律文书审核。

---

# 十一、Workflow关联

| Workflow | 与法律文书的关系 |
|---|---|
| WF-005_法律检索 | 提供法律依据 |
| WF-006_法律论证 | 提供文书论证基础 |
| WF-007_法律文书 | 核心 Workflow，生成和确认 Document |
| WF-008_庭审准备 | 使用文书形成庭审提纲 |
| WF-009_开庭与庭后 | 根据庭审结果更新文书 |
| WF-010_案件推进 | 根据案件状态生成后续文书 |
| WF-011_结案归档 | 归档全部文书 |
| WF-012_案件复盘 | 分析文书质量 |
| WF-013_知识沉淀 | 提炼文书模板 |

---

# 十二、索引建议

建议建立索引：

- matter_id
- document_no
- title
- document_category
- status
- confirmed_by_lawyer
- used_at
- created_at
- updated_at

---

# 十三、权限与安全

法律文书属于律师正式工作成果。

原则：

- 正式文书必须律师确认
- AI 不得擅自外发文书
- AI 不得擅自覆盖确认版本
- 文书导出和发送必须有人工确认
- 所有 AI 生成和修改过程必须记录
- 重要文书建议保留导出文件路径

---

# 十四、设计原则

1. Document 是法律文书对象，不是普通文件。

2. Word、PDF 只是 Document 的输出载体。

3. Document 必须建立在正式证据、法律检索和法律论证基础上。

4. AI 可以生成和校验文书，但不能确认正式文书。

5. 所有正式文书必须由律师确认后生效。

6. Document 必须保留与证据、检索、论证的关联关系。

7. 今日工作台根据 Document 状态推动律师完成文书审核和提交。

8. V1 只保留当前版本，复杂版本管理留到 V2。