# 11_AI工作记录（AI_Work_Record）

> 数据模型：AI工作记录（AI_Work_Record）
> 所属模块：案件工作区 / AI 工作记录
> 优先级：★★★★★
> 状态：V1.0

---

# 一、对象定位

AI工作记录（AI_Work_Record）用于记录 AI 在案件办理过程中完成的每一次工作。

AI_Work_Record 不是聊天记录。

也不是 Prompt 历史。

AI_Work_Record 表示 AI 对案件完成的一项具体工作及其结果。

例如：

- 转录录音
- OCR 图片
- 整理案件资料
- 推荐候选证据
- 法律检索
- 法律分析
- 起草文书
- 风险提示
- 生成任务
- 总结知识

AI_Work_Record 是 LawDesk AI 可审计、可追溯的重要基础。

---

# 二、核心职责

AI_Work_Record 负责：

- 保存 AI 工作记录
- 记录 AI 工作类型
- 保存 AI 输出结果
- 记录工作来源
- 建立案件关联
- 建立对象关联
- 支持 AI 工作追溯
- 支持案件复盘

AI_Work_Record 不负责：

- 保存正式案件数据
- 替代 Matter
- 替代 Material
- 替代 Evidence
- 替代 Document
- 替代 Knowledge

---

# 三、业务模式

AI 在案件中的每一次工作都会生成一条 AI_Work_Record。

例如：

上传录音

↓

AI 转录

↓

AI_Work_Record

↓

生成 Material

↓

律师确认

↓

进入正式业务对象

AI_Work_Record 永远保存过程。

正式对象保存最终结果。

---

# 四、生命周期

AI_Work_Record 生命周期：

创建

↓

处理中

↓

已完成

↓

律师确认引用

↓

已归档

也可以：

失败

---

# 五、字段设计

## 核心字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | UUID | 是 | 自动生成 | AI 工作记录 ID |
| matter_id | UUID | 是 | 无 | 所属案件 |
| ai_work_no | string | 是 | 自动生成 | AI 工作编号 |
| title | string | 是 | 无 | 工作标题 |
| work_category | string | 是 | 其他（other） | 工作类别 |
| source_object | string | 否 | 无 | 来源对象（Material、Evidence 等） |
| source_object_id | UUID | 否 | 无 | 来源对象 ID |
| output_summary | text | 否 | 无 | AI 输出摘要 |
| output_result | text | 否 | 无 | AI 输出结果 |
| status | string | 是 | 已完成（completed） | 当前状态 |
| confirmed_by_lawyer | boolean | 是 | false | 是否被律师确认采用 |
| confirmed_at | datetime | 否 | 无 | 确认时间 |
| ai_reason | text | 否 | 无 | AI 工作原因 |
| lawyer_note | text | 否 | 无 | 律师备注 |
| created_at | datetime | 是 | 当前时间 | 创建时间 |
| updated_at | datetime | 是 | 当前时间 | 更新时间 |

---

# 六、工作类别设计

AI 工作类别建议：

- OCR（ocr）
- 语音转录（transcription）
- 资料整理（material_processing）
- 证据分析（evidence_analysis）
- 法律检索（legal_research）
- 法律分析（legal_analysis）
- 文书生成（document_generation）
- 风险分析（risk_analysis）
- 任务生成（task_generation）
- 知识总结（knowledge_generation）
- 其他（other）

---

# 七、状态设计

AI_Work_Record 状态固定为：

- 处理中（processing）
- 已完成（completed）
- 已确认采用（confirmed）
- 已归档（archived）
- 失败（failed）

---

# 八、关系设计

AI_Work_Record 可以关联：

- 一个案件（Matter）
- 一个案件资料（Material）
- 一个正式证据（Evidence）
- 一个法律检索（Research）
- 一个法律文书（Document）
- 一个案件任务（Task）
- 一个知识沉淀（Knowledge）

AI_Work_Record 是所有 AI 工作过程的统一记录对象。

---

# 九、AI 参与规则

AI 可以：

- 自动生成工作记录
- 自动记录工作结果
- 自动记录来源对象
- 自动记录输出摘要
- 自动关联业务对象

AI 不可以：

- 自动修改律师确认记录
- 自动删除工作记录
- 自动覆盖正式业务数据

所有正式业务对象仍由律师确认。

---

# 十、今日工作台支持

Today 工作台可显示：

- AI 最新完成工作
- AI 待律师确认内容
- AI 失败任务
- AI 推荐下一步
- AI 今日工作摘要

示例：

AI 今日完成：

- 完成录音转录
- 完成法律检索
- 起草民事起诉状

待确认：

2 项。

---

# 十一、Workflow关联

| Workflow | 与 AI 工作记录的关系 |
|---|---|
| WF-001_咨询到接案 | 记录咨询分析 |
| WF-002_案件启动 | 记录案件初始化 |
| WF-003_资料整理 | 记录资料整理 |
| WF-004_证据管理 | 记录证据分析 |
| WF-005_法律检索 | 记录法律检索 |
| WF-006_法律论证 | 记录法律分析 |
| WF-007_法律文书 | 记录文书生成 |
| WF-008_庭审准备 | 记录庭审准备 |
| WF-009_开庭与庭后 | 记录庭审分析 |
| WF-010_案件推进 | 记录 AI 推进 |
| WF-011_结案归档 | 记录归档工作 |
| WF-012_案件复盘 | 记录复盘分析 |
| WF-013_知识沉淀 | 记录知识生成 |

---

# 十二、索引建议

建议建立索引：

- matter_id
- ai_work_no
- work_category
- status
- confirmed_by_lawyer
- created_at
- updated_at

---

# 十三、权限与安全

AI_Work_Record 属于系统审计记录。

原则：

- 所有 AI 工作可追溯
- AI 不得删除历史记录
- 律师可查看全部 AI 工作
- 所有 AI 输出必须保留来源
- 正式业务对象不得依赖单条 AI 工作记录

---

# 十四、设计原则

1. AI_Work_Record 记录 AI 做了什么，而不是 AI 说了什么。

2. AI_Work_Record 保存过程，正式业务对象保存结果。

3. 所有 AI 工作都应可追溯。

4. AI_Work_Record 与 Matter、Material、Evidence、Research、Document、Task、Knowledge 保持关联。

5. AI 可以自动生成记录，但不能修改律师确认结果。

6. AI_Work_Record 是 LawDesk AI 审计能力的重要基础。

7. Today 可直接读取 AI_Work_Record 展示 AI 今日工作。

8. AI_Work_Record 是 AI Native Lawyer OS 的运行日志，而不是聊天记录。