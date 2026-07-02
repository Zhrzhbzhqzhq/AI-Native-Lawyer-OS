# 12_案件工作区（Matter_Workspace）

> 数据模型：案件工作区（Matter_Workspace）
> 所属模块：案件工作区
> 优先级：★★★★★
> 状态：V1.0

---

# 一、对象定位

案件工作区（Matter_Workspace）是一个案件的完整工作空间。

Matter_Workspace 不是单独案件。

Matter 是案件本体。

Matter_Workspace 是律师围绕一个 Matter 办案时看到和使用的完整工作环境。

它负责把以下对象组织到同一个案件空间中：

- 案件
- 客户
- 案件资料
- 证据
- 法律文书
- 案件时间轴
- 案件任务
- 法律检索
- 知识沉淀
- AI工作记录

---

# 二、核心职责

Matter_Workspace 负责：

- 组织案件相关对象
- 提供案件工作入口
- 聚合案件全部业务对象及当前工作状态
- 聚合案件下一步工作
- 聚合 AI 建议
- 聚合风险提醒
- 支持律师快速进入具体工作模块

Matter_Workspace 不负责：

- 替代 Matter
- 保存原始文件
- 替代 Evidence
- 替代 Document
- 替代 Task
- 替代 AI_Work_Record

---

# 三、业务模式

一个 Matter 对应一个 Matter_Workspace。

律师从：

今日工作台

或

案件管理

点击案件后，

进入 Matter_Workspace。

在 Matter_Workspace 中，律师可以进入：

- 总览
- 客户
- 案件资料
- 证据
- 法律文书
- 案件时间轴
- 案件任务
- 法律检索
- AI工作记录
- 复盘
- 知识沉淀

Matter_Workspace 是案件工作的唯一入口，也是整个案件业务对象的聚合根（Aggregate Root）。

---

# 四、生命周期

Matter_Workspace 生命周期：

创建

↓

初始化

↓

使用中

↓

结案中

↓

已关闭

↓

已归档

Matter_Workspace 随 Matter 创建而创建。

Matter 归档后，Matter_Workspace 进入只读归档状态。

---

# 五、字段设计

## 核心字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | UUID | 是 | 自动生成 | 工作区唯一 ID |
| matter_id | UUID | 是 | 无 | 所属案件 ID |
| workspace_no | string | 是 | 自动生成 | 工作区编号 |
| title | string | 是 | 无 | 工作区名称 |
| status | string | 是 | 初始化（initializing） | 工作区状态 |
| current_module | string | 否 | 总览（overview） | 当前工作模块 |
| current_focus | text | 否 | 无 | 当前工作重点 |
| ai_summary | text | 否 | 无 | AI 工作区摘要 |
| ai_next_action | text | 否 | 无 | AI 下一步建议 |
| risk_summary | text | 否 | 无 | 风险摘要 |
| last_active_at | datetime | 否 | 无 | 最近活跃时间 |
| closed_at | datetime | 否 | 无 | 关闭时间 |
| archived_at | datetime | 否 | 无 | 归档时间 |
| created_at | datetime | 是 | 当前时间 | 创建时间 |
| updated_at | datetime | 是 | 当前时间 | 更新时间 |

---

# 六、工作区模块设计

Matter_Workspace 固定包含：

- 总览（overview）
- 客户（client）
- 案件资料（material）
- 证据（evidence）
- 法律文书（document）
- 案件时间轴（timeline）
- 案件任务（task）
- 法律检索（research）
- AI工作记录（ai_work_record）
- 案件复盘（review）
- 知识沉淀（knowledge）

V1 不增加其他一级模块。

---

# 七、状态设计

Matter_Workspace 状态固定为：

- 初始化（initializing）
- 使用中（active）
- 结案中（closing）
- 已关闭（closed）
- 已归档（archived）

---

# 八、关系设计

Matter_Workspace 关联：

- 一个案件（Matter）
- 多个客户（Client）
- 多份案件资料（Material）
- 多份证据（Evidence）
- 多份法律文书（Document）
- 多个时间轴节点（Timeline）
- 多个案件任务（Task）
- 多份法律检索成果（Research）
- 多条知识沉淀（Knowledge）
- 多条 AI 工作记录（AI_Work_Record）

Matter_Workspace 是案件对象的聚合入口。

---

# 九、AI 参与规则

AI 可以：

- 聚合案件摘要
- 判断当前工作重点
- 识别风险
- 推荐下一步工作
- 提醒未完成任务
- 提醒待确认 AI 成果
- 推荐进入某个 Workflow
- 更新工作区摘要
- 跨多个业务对象进行综合分析，并生成统一工作建议

AI 不可以：

- 自动关闭工作区
- 自动归档工作区
- 自动修改正式案件信息
- 自动删除任何业务对象

所有正式变更必须律师确认。

---

# 十、今日工作台支持

Today 工作台可从 Matter_Workspace 读取：

- 当前工作重点
- 当前风险摘要
- AI 下一步建议
- 最近活跃案件
- 待处理模块
- 待确认 AI 成果

示例：

今日建议：

进入

张三诉李四民间借贷纠纷

案件工作区

优先处理：

证据确认

AI 提示：

该案仍有 3 份候选证据未确认。

---

# 十一、Workflow关联

| Workflow | 与案件工作区的关系 |
|---|---|
| WF-002_案件启动 | 创建并初始化 Matter_Workspace |
| WF-003_资料整理 | 更新案件资料模块 |
| WF-004_证据管理 | 更新证据模块 |
| WF-005_法律检索 | 更新法律检索模块 |
| WF-006_法律论证 | 支撑法律文书与庭审准备 |
| WF-007_法律文书 | 更新法律文书模块 |
| WF-008_庭审准备 | 更新庭审准备相关内容 |
| WF-009_开庭与庭后 | 更新庭审记录和案件状态 |
| WF-010_案件推进 | 更新当前工作重点 |
| WF-011_结案归档 | 关闭并归档工作区 |
| WF-012_案件复盘 | 更新复盘内容 |
| WF-013_知识沉淀 | 输出知识沉淀成果 |

---

# 十二、索引建议

建议建立索引：

- matter_id
- workspace_no
- status
- current_module
- last_active_at
- created_at
- updated_at

---

# 十三、权限与安全

Matter_Workspace 是案件工作入口。

原则：

- 一个工作区只属于一个 Matter
- 律师拥有完整控制权
- AI 不得自动关闭或归档工作区
- 工作区聚合的信息不得擅自外发
- 归档后默认只读

---

# 十四、设计原则

1. Matter_Workspace 是案件工作空间，不是案件本体。

2. 一个 Matter 对应一个 Matter_Workspace。

3. Matter_Workspace 负责聚合，不替代专用对象。

4. 律师通过 Matter_Workspace 进入具体办案模块。

5. AI 通过 Matter_Workspace 理解案件当前整体状态。

6. Today 根据 Matter_Workspace 判断案件是否需要优先处理。

7. Matter_Workspace 关闭后，案件进入归档和复盘阶段。

8. V1 中 Matter_Workspace 保持简单，只作为聚合入口和工作状态承载对象。