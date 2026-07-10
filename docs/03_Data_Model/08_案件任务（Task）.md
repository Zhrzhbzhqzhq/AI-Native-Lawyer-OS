# 08_案件任务（Task）

> 数据模型：案件任务（Task）
> 所属模块：案件工作区 / 今日工作台 / 任务管理
> 优先级：★★★★★
> 状态：V1.0

---

# 一、对象定位

案件任务（Task）是律师在案件办理过程中需要执行的具体工作对象。

Task 不是 Timeline（时间轴）。

Timeline 记录案件发生了什么。

Task 表示律师下一步需要完成什么。

Task 是 Today 工作台和 AI 主动推进案件的核心对象。

例如：

- 完成客户信息确认
- 整理案件资料
- 确认证据
- 法律检索
- 起草起诉状
- 提交法院
- 联系客户
- 准备庭审
- 申请执行

---

# 二、核心职责

Task 负责：

- 保存案件任务
- 建立任务优先级
- 建立截止期限
- 建立任务状态
- 关联案件
- 关联时间轴
- 关联文书
- 关联证据
- 支持 AI 自动生成任务
- 支持 Today 工作台排序

Task 不负责：

- 保存案件资料
- 保存正式证据
- 保存法律文书
- 保存 AI 工作记录
- 替代 Timeline

---

# 三、业务模式

Task 可以来源于：

- Workflow 自动生成
- AI 自动建议
- Timeline 推动生成
- 律师手工创建

例如：

Timeline：

立案成功

↓

AI 自动生成：

准备开庭材料

↓

Task

律师完成后：

Task 状态更新。

Today 工作台自动刷新。

---

# 四、生命周期

Task 生命周期：

创建

↓

待开始

↓

进行中

↓

待律师确认

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
| id | UUID | 是 | 自动生成 | 任务唯一 ID |
| matter_id | UUID | 是 | 无 | 所属案件 |
| task_no | string | 是 | 自动生成 | 任务编号 |
| title | string | 是 | 无 | 任务标题 |
| task_category | string | 是 | 其他（other） | 任务类别 |
| status | string | 是 | 待开始（todo） | 当前状态 |
| priority | string | 否 | 中（medium） | 优先级 |
| due_at | datetime | 否 | 无 | 截止时间 |
| description | text | 否 | 无 | 任务说明 |
| related_timeline_id | UUID | 否 | 无 | 关联时间轴 |
| related_document_id | UUID | 否 | 无 | 关联文书 |
| related_evidence_id | UUID | 否 | 无 | 关联证据 |
| ai_reason | text | 否 | 无 | AI 生成原因 |
| ai_next_action | text | 否 | 无 | AI 建议 |
| lawyer_note | text | 否 | 无 | 律师备注 |
| completed_at | datetime | 否 | 无 | 完成时间 |
| confirmed_by_lawyer | boolean | 是 | false | 是否确认完成 |
| created_at | datetime | 是 | 当前时间 | 创建时间 |
| updated_at | datetime | 是 | 当前时间 | 更新时间 |

---

# 六、任务类别设计

Task 类别建议：

- 客户沟通（communication）
- 资料整理（material）
- 证据管理（evidence）
- 法律检索（research）
- 法律论证（analysis）
- 法律文书（document）
- 庭审准备（trial_preparation）
- 开庭（trial）
- 执行（enforcement）
- 结案（closure）
- 其他（other）

---

# 七、状态设计

Task 状态固定为：

- 待开始（todo）
- 进行中（in_progress）
- 待律师确认（waiting_review）
- 已完成（completed）
- 已归档（archived）
- 已取消（cancelled）

---

# 八、关系设计

Task 可以关联：

- 一个案件（Matter）
- 一个时间轴事件（Timeline）
- 一个法律文书（Document）
- 一个正式证据（Evidence）
- 一个 AI 工作记录（AI_Work_Record）

Task 是 Today 工作台的核心数据来源。

---

# 九、AI 参与规则

AI 可以：

- 自动生成任务
- 自动排序任务
- 自动识别超期任务
- 自动提醒截止期限
- 自动建议下一步
- 自动发现遗漏任务
- 自动拆分复杂任务
- 自动合并重复任务

AI 不可以：

- 自动确认任务完成
- 自动删除任务
- 自动改变律师确认状态
- 自动执行正式法律行为

所有正式完成必须律师确认。

---

# 十、今日工作台支持

Today 工作台主要读取 Task。

显示内容包括：

- 今日任务
- 超期任务
- 高优先级任务
- AI 推荐任务
- 即将到期任务

Today 默认排序：

1. 超期
2. 今日到期
3. AI 高优先级
4. 普通任务

示例：

今日建议：

① 完成证据目录

② 起草起诉状

③ 联系客户

---

# 十一、Workflow关联

| Workflow | 与任务的关系 |
|---|---|
| WF-001_咨询到接案 | 自动生成咨询任务 |
| WF-002_案件启动 | 自动生成启动任务 |
| WF-003_资料整理 | 自动生成资料整理任务 |
| WF-004_证据管理 | 自动生成证据确认任务 |
| WF-005_法律检索 | 自动生成检索任务 |
| WF-006_法律论证 | 自动生成论证任务 |
| WF-007_法律文书 | 自动生成文书任务 |
| WF-008_庭审准备 | 自动生成庭审准备任务 |
| WF-009_开庭与庭后 | 自动生成庭后任务 |
| WF-010_案件推进 | AI 持续生成推进任务 |
| WF-011_结案归档 | 自动生成归档任务 |
| WF-012_案件复盘 | 自动生成复盘任务 |
| WF-013_知识沉淀 | 自动生成知识沉淀任务 |

---

# 十二、索引建议

建议建立索引：

- matter_id
- task_no
- task_category
- status
- priority
- due_at
- completed_at
- created_at
- updated_at

---

# 十三、权限与安全

Task 属于案件执行计划。

原则：

- 所有任务可追溯
- AI 不得擅自删除任务
- AI 不得自动确认完成
- 律师拥有最终确认权
- 所有 AI 自动生成任务必须记录来源

---

# 十四、设计原则

1. Task 表示律师要完成的工作，而不是案件事件。

2. Timeline 推动 Task，Task 推动 Today。

3. AI 可以生成任务，但不能确认任务完成。

4. Today 工作台以 Task 为核心组织每日工作。

5. Task 与 Matter、Timeline、Evidence、Document 保持关联。

6. 一个案件可以拥有多个 Task。

7. Task 是 AI 主动推进案件的主要执行对象。

8. Task 是 LawDesk 每日工作的核心驱动对象。