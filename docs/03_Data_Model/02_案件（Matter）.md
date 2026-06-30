# 02_案件（Matter）

> 数据模型：案件（Matter）
> 所属模块：案件管理 / 案件工作区 / 今日工作台
> 优先级：★★★★★
> 状态：V1.1 优化

---

# 一、对象定位

案件（Matter）是 AI Native Lawyer OS 的核心业务对象。它不是文件夹，也不是简单登记表，而是承载律师办案全过程的“工作实体”。

Matter 负责整合案件参与方、业务资料、证据、文书、时间轴、任务、法律检索、AI 工作记录和知识沉淀，形成完整案件语义。

---

# 二、核心职责

Matter 核心职责：

- 结构化保存案件主体信息
- 表示案件当前组织状态与业务阶段
- 关联客户、对手、法院、案号等基础信息
- 关联案件资料、证据、文书、时间轴、任务、检索和 AI 记录
- 为今日工作台提供工作优先级、风险和下一步建议
- 保留案件关键时间点与可审计状态信息

Matter 不负责：

- 存储原始文件二进制内容
- 替代证据、文书、任务、知识等专用实体
- 承担内容审核、审批或人工签署行为

---

# 三、业务模式

Matter 仅表现“案件工作对象”，而不是内容容器。相关文档、文件、证据、检索结果、AI 产物均由独立对象管理，Matter 通过关系进行组织。

---

# 四、生命周期与状态设计

建议将案件状态拆成两个维度：

- `status`：案件组织/流程状态
- `stage`：业务工作阶段 / 当前关注点

示例：

- `status`
  - 咨询中（consultation）
  - 已接案（accepted）
  - 办理中（active）
  - 庭审中（litigation）
  - 案件推进（progressing）
  - 结案中（closing）
  - 已结案（closed）
  - 已归档（archived）
  - 暂停（paused）

- `stage`
  - 接案阶段（intake）
  - 准备阶段（preparation）
  - 证据收集（evidence_collection）
  - 文书起草（drafting）
  - 庭审准备（litigation_preparation）
  - 开庭（trial）
  - 庭后（post_trial）
  - 复盘（review）
  - 知识沉淀（knowledge_capture）

> 通过区分 `status` 和 `stage`，Matter 能同时表达“案件当前处于哪条流程”与“当前工作关注点是什么”。

---

# 五、字段设计

## 核心字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| id | UUID | 是 | 自动生成 | 案件唯一 ID |
| matter_no | string | 是 | 自动生成 | 案件编号 |
| title | string | 是 | 无 | 案件名称 |
| matter_category | string | 否 | 未分类 | 案件类别（民事、刑事、行政、非诉等） |
| practice_area | string | 否 | 无 | 业务领域 |
| cause_of_action | string | 否 | 未填写 | 案由 |
| status | string | 是 | consultation | 流程状态 |
| stage | string | 是 | intake | 当前业务阶段 |
| priority | string | 否 | medium | 优先级：高（high）/中（medium）/低（low） |
| risk_level | string | 否 | medium | 风险等级：高（high）/中（medium）/低（low） |
| primary_client_id | UUID | 否 | 无 | 主要客户 ID |
| opponent_name | string | 否 | 无 | 对方当事人 |
| court | string | 否 | 无 | 法院/仲裁机构 |
| case_number | string | 否 | 无 | 外部案号 |
| judge | string | 否 | 无 | 承办法官 |
| next_deadline | datetime | 否 | 无 | 下一个关键期限 |
| current_focus | text | 否 | 无 | 当前工作重点 |
| next_action | text | 否 | 无 | 下一步建议 |
| lawyer_note | text | 否 | 无 | 律师备注 |
| ai_summary | text | 否 | 无 | AI 生成摘要 |
| ai_next_action | text | 否 | 无 | AI 建议下一步 |
| ai_risk_tip | text | 否 | 无 | AI 风险提示 |
| accepted_at | datetime | 否 | 无 | 接案时间 |
| started_at | datetime | 否 | 无 | 启动时间 |
| closed_at | datetime | 否 | 无 | 结案时间 |
| archived_at | datetime | 否 | 无 | 归档时间 |
| paused_at | datetime | 否 | 无 | 暂停时间 |
| created_at | datetime | 是 | 当前时间 | 创建时间 |
| updated_at | datetime | 是 | 当前时间 | 更新时间 |

> 建议使用 `accepted_at` / `started_at` 来区分“已接案”与“案件正式启动”的时间点。

---

# 六、关系设计

Matter 应与下列对象保持独立关系：

- 一个或多个客户（通过 `MatterClient` 关系表）
- 多份案件资料（Material）
- 多份证据（Evidence）
- 多份法律文书（Document）
- 多个时间轴节点（TimelineEvent）
- 多个案件任务（Task）
- 多份法律检索结果（ResearchResult）
- 多条 AI 工作记录（AIWorkRecord）
- 多条知识沉淀（KnowledgeEntry）
- 一个案件工作区（MatterWorkspace）

推荐关系实体：

- `MatterClient`：`matter_id`, `client_id`, `role`, `relation_type`
- `MatterMaterial`：`matter_id`, `material_id`, `material_type`, `status`
- `MatterEvidence`：`matter_id`, `evidence_id`, `evidence_type`
- `MatterDocument`：`matter_id`, `document_id`, `document_type`

---

# 七、索引建议

建议建立索引：

- `matter_no`
- `title`
- `status`
- `stage`
- `primary_client_id`
- `risk_level`
- `next_deadline`
- `updated_at`
- `created_at`

---

# 八、AI 参与规则

AI 在 Matter 领域的职责：

- 读取：案件基础信息、关联资料、证据、文书、时间轴、任务、检索、AI 记录
- 生成：案件摘要、风险提示、下一步建议、今日工作建议、受影响对象分析、更新建议
- 支持：自动提醒、待办、风险预警

AI 不直接执行：

- 接案确认
- 正式案件信息修改
- 案件删除、关闭、归档
- 文书提交
- 法律意见最终签署

> 所有正式变更必须由律师确认，并保留审计记录。

---

# 九、今日工作台支持

今日工作台应从 Matter 提供：

- `status`
- `stage`
- `priority`
- `risk_level`
- `next_deadline`
- `next_action`
- `ai_summary`
- `ai_next_action`
- `lawyer_note`
- 逾期任务 / 待确认事项（通过聚合 Task、AIWorkRecord 等）

---

# 十、权限与安全

首版定位独立律师使用，未来可扩展团队权限。

原则：

- 律师本人控制案件数据
- AI 不得擅自外发案件信息
- 敏感资料优先本地存储
- 所有操作可追溯
- 删除/归档/关闭需律师确认

---

# 十一、设计原则

1. Matter 是“工作对象”，而非“文档容器”。
2. Matter 聚焦“案件全过程”与“工作状态”，不替代专用实体。 
3. 通过关系对象保持信息可拆分、可复用、可审计。
4. 明确“状态”、“阶段”、“参与方”与“时间点”之间的边界。
5. AI 提供辅助建议，不直接改变正式业务数据。


4. Workflow 推动案件演化。

5. AI 围绕案件工作。

6. 今日工作台根据案件状态推动律师每天工作。

7. 所有正式案件信息必须由律师确认后生效。

8. 案件结束后进入复盘和知识沉淀。