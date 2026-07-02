# 07_案件时间轴（Timeline）

> 数据模型：案件时间轴（Timeline）
> 所属模块：案件工作区 / 案件时间轴
> 优先级：★★★★★
> 状态：V1.0

---

# 一、对象定位

案件时间轴（Timeline）用于记录案件办理全过程中的关键事件。

Timeline 不是日志。

也不是待办事项。

Timeline 是案件的重要事实、程序节点和工作节点的时间序列记录。

例如：

- 客户咨询
- 接案
- 起诉
- 立案
- 开庭
- 判决
- 执行申请
- 回款
- 结案

AI 可以依据 Timeline 理解案件进展，并持续推动下一步工作。

---

# 二、核心职责

Timeline 负责：

- 保存案件关键事件
- 建立案件关键事件时间顺序
- 记录事件状态
- 关联案件
- 关联证据
- 关联法律文书
- 关联案件任务
- 支持 AI 推进案件
- 支持案件复盘

Timeline 不负责：

- 保存案件资料
- 替代 Task
- 替代 Document
- 替代 Evidence
- 替代律师判断

---

# 三、业务模式

Timeline 中每一个节点都代表案件中的一个重要事件。

事件可以由：

- Workflow 自动生成
- AI 建议生成
- 律师手工创建

事件发生后：

AI 自动分析：

- 是否影响案件推进
- 是否需要新增任务
- 是否需要更新文书
- 是否需要补充证据
- 是否需要法律检索

律师确认后生效。

---

# 四、生命周期

Timeline 生命周期：

创建

↓

待确认

↓

已确认

↓

已完成

↓

已归档

也可以：

取消

---

# 五、字段设计

## 核心字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | UUID | 是 | 自动生成 | 时间轴事件 ID |
| matter_id | UUID | 是 | 无 | 所属案件 |
| timeline_no | string | 是 | 自动生成 | 时间轴编号 |
| title | string | 是 | 无 | 事件标题 |
| timeline_category | string | 是 | 其他（other） | 事件类别 |
| event_time | datetime | 是 | 无 | 事件发生时间 |
| status | string | 是 | 待确认（pending） | 当前状态 |
| description | text | 否 | 无 | 事件说明 |
| related_document_id | UUID | 否 | 无 | 关联法律文书 |
| related_evidence_id | UUID | 否 | 无 | 关联证据 |
| related_task_id | UUID | 否 | 无 | 关联任务 |
| ai_summary | text | 否 | 无 | AI 摘要 |
| ai_next_action | text | 否 | 无 | AI 下一步建议 |
| lawyer_note | text | 否 | 无 | 律师备注 |
| confirmed_by_lawyer | boolean | 是 | false | 是否确认 |
| confirmed_at | datetime | 否 | 无 | 确认时间 |
| created_at | datetime | 是 | 当前时间 | 创建时间 |
| updated_at | datetime | 是 | 当前时间 | 更新时间 |

---

# 六、事件类别设计

Timeline 类别建议：

- 客户咨询（consultation）
- 接案（acceptance）
- 案件启动（matter_start）
- 起诉（filing）
- 立案（case_acceptance）
- 开庭（trial）
- 判决（judgment）
- 执行（enforcement）
- 回款（payment）
- 结案（closure）
- 其他（other）

---

# 七、状态设计

Timeline 状态固定为：

- 待确认（pending）
- 已确认（confirmed）
- 已完成（completed）
- 已归档（archived）
- 已取消（cancelled）

---

# 八、关系设计

Timeline 可以关联：

- 一个案件（Matter）
- 一个法律文书（Document）
- 一个正式证据（Evidence）
- 一个案件任务（Task）
- 一个 AI 工作记录（AI_Work_Record）

Timeline 是案件全过程的时间索引，也是 Today 工作台和 AI 推进案件的重要依据。

---

# 九、AI 参与规则

AI 可以：

- 自动生成时间轴节点
- 自动识别关键日期
- 自动发现程序节点
- 自动生成下一步建议
- 自动提醒期限
- 自动发现遗漏事件
- 自动生成案件进展摘要

AI 不可以：

- 自动确认事件
- 自动修改正式事件
- 自动删除事件
- 自动改变案件状态

所有正式事件必须律师确认。

---

# 十、今日工作台支持

今日工作台可显示：

- 今日发生事件
- 即将到期事件
- 超期事件
- AI 建议推进事件
- 下一关键节点

示例：

今日重点：

上午9:30

民间借贷纠纷

开庭

AI建议：

准备证据目录。

---

# 十一、Workflow关联

| Workflow | 与时间轴的关系 |
|---|---|
| WF-001_咨询到接案 | 建立咨询事件 |
| WF-002_案件启动 | 建立案件启动事件 |
| WF-003_资料整理 | 建立资料整理事件 |
| WF-004_证据管理 | 建立证据确认事件 |
| WF-005_法律检索 | 建立检索事件 |
| WF-006_法律论证 | 建立论证事件 |
| WF-007_法律文书 | 建立文书事件 |
| WF-008_庭审准备 | 建立庭审准备事件 |
| WF-009_开庭与庭后 | 建立庭审事件 |
| WF-010_案件推进 | 建立推进事件 |
| WF-011_结案归档 | 建立归档事件 |
| WF-012_案件复盘 | 建立复盘事件 |
| WF-013_知识沉淀 | 建立知识沉淀事件 |

---

# 十二、索引建议

建议建立索引：

- matter_id
- timeline_no
- timeline_category
- event_time
- status
- confirmed_by_lawyer
- created_at
- updated_at

---

# 十三、权限与安全

Timeline 属于案件核心业务记录。

原则：

- 所有事件可追溯
- AI 不得擅自删除事件
- 删除事件必须律师确认
- AI 所有自动生成记录必须保留

---

# 十四、设计原则

1. Timeline 是案件全过程的时间索引。

2. Timeline 不等于日志，也不等于任务。

3. Timeline 只记录关键事件。

4. AI 可以生成事件，但不能确认事件。

5. Timeline 与 Task、Evidence、Document 保持关联。

6. Today 根据 Timeline 推动案件进展。

7. Timeline 是案件复盘的重要基础。

8. Timeline 为 AI 提供案件进展的连续上下文。