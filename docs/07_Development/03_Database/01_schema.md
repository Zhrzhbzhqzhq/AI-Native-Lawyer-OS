---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Database Schema
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

NOTE: 本文件讨论 Database Schema（Data Model / Schema 层）。
Database Schema 是 Domain Model（业务对象模型）的持久化实现。Domain Model 定义业务对象，Database Schema 定义这些对象如何落库。


# 01_schema

## 1. Schema Principles

- 使用 PostgreSQL。
- 所有主键使用 UUID。
- 所有表名和字段名使用 snake_case。
- 每张核心表都包含 `id`、`created_at`、`updated_at`。
- 采用 V1 最小可运行 Schema，避免过度设计。
- 不引入多租户、团队权限、复杂版本管理、向量数据库或未冻结新 Domain Model。
- `matters` 不包含 `workspace_id`，避免与 `matter_workspaces` 循环引用。
- 所有关系表也包含 id、created_at、updated_at，便于 API 操作和后续审计扩展。
- `matter_workspaces` 仅通过 `matter_id` 关联 `matters`。
- `ai_work_records` 不设计成聊天记录，不以 `prompt`/`response` 为核心字段。

## 2. Core Tables

### matters
- id: UUID, required, default generated, primary key
- matter_no: text, required, no default, 案件编号
- title: text, required, no default, 案件名称
- summary: text, optional, no default, 案件摘要
- matter_category: text, optional, default 'unknown', 案件类别
- practice_area: text, optional, default 'unknown', 业务领域
- cause_of_action: text, optional, default 'unknown', 案由
- status: text, required, default 'consultation', 案件状态
- stage: text, required, default 'intake', 当前阶段
- priority: text, optional, default 'medium', 优先级
- risk_level: text, optional, default 'medium', 风险等级
- source: text, optional, default 'manual', Matter 创建来源
- owner_id: UUID, optional, no default, reserved for future user/account integration
- primary_client_id: UUID, optional, references clients(id), 主要客户 ID
- opponent_name: text, optional, no default, 对方当事人
- court: text, optional, no default, 法院
- case_number: text, optional, no default, 案号
- judge: text, optional, no default, 承办法官
- next_deadline: timestamp with time zone, optional, no default, 下一个关键期限
- current_focus: text, optional, no default, 当前关注点
- next_action: text, optional, no default, 下一步行动
- lawyer_note: text, optional, no default, 律师备注
- ai_summary: text, optional, no default, AI 摘要
- ai_next_action: text, optional, no default, AI 下一步建议
- ai_risk_tip: text, optional, no default, AI 风险提示
- accepted_at: timestamp with time zone, optional, no default, 接案时间
- started_at: timestamp with time zone, optional, no default, 正式启动时间
- closed_at: timestamp with time zone, optional, no default, 结案时间
- archived_at: timestamp with time zone, optional, no default, 归档时间
- paused_at: timestamp with time zone, optional, no default, 暂停时间
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### clients
- id: UUID, required, default generated, primary key
- client_no: text, required, no default, 客户编号
- name: text, required, no default, 姓名或单位名称
- client_type: text, required, default 'person', 客户类型
- identity_type: text, optional, default 'id_card', 证件类型
- identity_no: text, optional, no default, 证件号码
- gender: text, optional, default 'unknown', 性别
- birthday: date, optional, no default, 出生日期
- phone: text, optional, no default, 手机号
- email: text, optional, no default, 邮箱
- wechat: text, optional, no default, 微信
- company: text, optional, no default, 公司
- position: text, optional, no default, 职务
- address: text, optional, no default, 联系地址
- postcode: text, optional, no default, 邮政编码
- remark: text, optional, no default, 律师备注
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### materials
- id: UUID, required, default generated, primary key
- matter_id: UUID, required, references matters(id)
- material_no: text, required, no default, 资料编号
- title: text, required, no default, 资料标题
- material_category: text, required, default 'unknown', 资料类别
- source_type: text, optional, no default, 来源类型
- file_name: text, optional, no default, 文件名
- file_path: text, optional, no default, 文件路径
- file_size: bigint, optional, no default, 文件大小（字节）
- mime_type: text, optional, no default, MIME 类型
- status: text, required, default 'pending', 资料状态
- ai_summary: text, optional, no default, AI 摘要
- ai_tags: text[], optional, default '{}', AI 标签
- ai_category: text, optional, no default, AI 分类
- is_duplicate: boolean, required, default false, 是否疑似重复
- duplicate_of: UUID, optional, no default, 重复资料 ID
- is_candidate_evidence: boolean, required, default false, 是否候选证据
- candidate_evidence_reason: text, optional, no default, 候选证据理由
- completeness_impact: text, optional, no default, 完整度影响
- lawyer_note: text, optional, no default, 律师备注
- confirmed_by_lawyer: boolean, required, default false, 是否确认
- confirmed_at: timestamp with time zone, optional, no default, 确认时间
- uploaded_at: timestamp with time zone, required, default now(), 上传时间
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### evidence
- id: UUID, required, default generated, primary key
- matter_id: UUID, required, references matters(id)
- evidence_no: text, required, no default, 证据编号
- title: text, required, no default, 证据标题
- evidence_category: text, required, default 'other', 证据类别
- primary_material_id: UUID, optional, references materials(id)
- purpose: text, optional, no default, 证明目的
- source_description: text, optional, no default, 来源说明
- status: text, required, default 'candidate', 证据状态
- importance: text, optional, default 'medium', 重要程度
- credibility: text, optional, default 'unknown', 可信度
- strength: text, optional, default 'medium', 证据强度，weak/medium/strong
- ai_summary: text, optional, no default, AI 摘要
- ai_analysis: text, optional, no default, AI 分析
- ai_risk_tip: text, optional, no default, AI 风险提示
- lawyer_note: text, optional, no default, 律师备注
- confirmed_by_lawyer: boolean, required, default false, 是否确认
- confirmed_at: timestamp with time zone, optional, no default, 确认时间
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### documents
- id: UUID, required, default generated, primary key
- matter_id: UUID, required, references matters(id)
- document_no: text, required, no default, 文书编号
- title: text, required, no default, 文书标题
- document_category: text, required, default 'other', 文书类别
- status: text, required, default 'draft', 文书状态
- version: integer, required, default 1, 文档版本号
- content: text, optional, no default, 文书内容
- file_path: text, optional, no default, 文件路径
- file_name: text, optional, no default, 文件名
- format: text, optional, default 'markdown', 格式
- ai_summary: text, optional, no default, AI 摘要
- ai_review: text, optional, no default, AI 校验
- ai_risk_tip: text, optional, no default, AI 风险提示
- lawyer_note: text, optional, no default, 律师备注
- confirmed_by_lawyer: boolean, required, default false, 是否确认
- confirmed_at: timestamp with time zone, optional, no default, 确认时间
- used_at: timestamp with time zone, optional, no default, 使用时间
- archived_at: timestamp with time zone, optional, no default, 归档时间
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### timelines
- id: UUID, required, default generated, primary key
- matter_id: UUID, required, references matters(id)
- timeline_no: text, required, no default, 时间轴编号
- title: text, required, no default, 事件标题
- timeline_category: text, required, default 'other', 事件类别
- event_time: timestamp with time zone, required, no default, 事件时间
- status: text, required, default 'pending', 事件状态
- source: text, required, default 'manual', 创建来源，manual/workflow/ai/court
- description: text, optional, no default, 事件说明
- related_document_id: UUID, optional, references documents(id)
- related_evidence_id: UUID, optional, references evidence(id)
- related_task_id: UUID, optional, references tasks(id)
- ai_summary: text, optional, no default, AI 摘要
- ai_next_action: text, optional, no default, AI 下一步建议
- lawyer_note: text, optional, no default, 律师备注
- confirmed_by_lawyer: boolean, required, default false, 是否确认
- confirmed_at: timestamp with time zone, optional, no default, 确认时间
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### tasks
- id: UUID, required, default generated, primary key
- matter_id: UUID, required, references matters(id)
- task_no: text, required, no default, 任务编号
- title: text, required, no default, 任务标题
- task_category: text, required, default 'other', 任务类别
- generated_by: text, required, default 'manual', 生成来源，manual/workflow/ai/court
- status: text, required, default 'todo', 任务状态
- priority: text, optional, default 'medium', 优先级
- due_at: timestamp with time zone, optional, no default, 截止时间
- description: text, optional, no default, 任务说明
- related_timeline_id: UUID, optional, references timelines(id)
- related_document_id: UUID, optional, references documents(id)
- related_evidence_id: UUID, optional, references evidence(id)
- ai_reason: text, optional, no default, AI 原因
- ai_next_action: text, optional, no default, AI 下一步建议
- lawyer_note: text, optional, no default, 律师备注
- completed_at: timestamp with time zone, optional, no default, 完成时间
- confirmed_by_lawyer: boolean, required, default false, 是否确认
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### research
- id: UUID, required, default generated, primary key
- matter_id: UUID, required, references matters(id)
- research_no: text, required, no default, 检索编号
- title: text, required, no default, 检索标题
- research_category: text, required, default 'legal_issue', 检索类别
- legal_question: text, required, no default, 法律问题
- legal_basis: text, optional, no default, 法律依据
- case_rules: text, optional, no default, 裁判规则
- case_summary: text, optional, no default, 类案总结
- ai_summary: text, optional, no default, AI 摘要
- ai_analysis: text, optional, no default, AI 分析
- ai_risk_tip: text, optional, no default, AI 风险提示
- lawyer_conclusion: text, optional, no default, 律师结论
- status: text, required, default 'waiting_review', 当前状态
- confirmed_by_lawyer: boolean, required, default false, 是否确认
- confirmed_at: timestamp with time zone, optional, no default, 确认时间
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### knowledge
- id: UUID, required, default generated, primary key
- matter_id: UUID, optional, references matters(id)
- source_matter_id: UUID, optional, references matters(id), 来源案件 ID
- knowledge_no: text, required, no default, 知识编号
- title: text, required, no default, 知识标题
- knowledge_category: text, required, default 'practice', 知识类别
- summary: text, optional, no default, 摘要
- content: text, optional, no default, 内容
- application_scope: text, optional, no default, 适用范围
- ai_summary: text, optional, no default, AI 摘要
- ai_tags: text[], optional, default '{}', AI 标签
- lawyer_note: text, optional, no default, 律师备注
- reuse_count: integer, required, default 0, 复用次数
- confirmed_by_lawyer: boolean, required, default false, 是否确认
- confirmed_at: timestamp with time zone, optional, no default, 确认时间
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### ai_work_records
- id: UUID, required, default generated, primary key
- matter_id: UUID, required, references matters(id)
- ai_work_no: text, required, no default, AI 工作编号
- title: text, required, no default, 工作标题
- work_category: text, required, default 'other', 工作类别
- source_object: text, optional, no default, 来源对象
- source_object_id: UUID, optional, no default, 来源对象 ID
- output_summary: text, optional, no default, 输出摘要
- output_result: text, optional, no default, 输出结果
- duration_ms: bigint, optional, no default, AI 执行时长（毫秒）
- status: text, required, default 'completed', 工作状态
- confirmed_by_lawyer: boolean, required, default false, 是否确认
- confirmed_at: timestamp with time zone, optional, no default, 确认时间
- ai_reason: text, optional, no default, AI 原因
- lawyer_note: text, optional, no default, 律师备注
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### matter_workspaces
- id: UUID, required, default generated, primary key
- matter_id: UUID, required, references matters(id)
- workspace_no: text, required, no default, 工作区编号
- title: text, required, no default, 工作区名称
- status: text, required, default 'initializing', 工作区状态
- current_module: text, optional, default 'overview', 当前模块
- current_focus: text, optional, no default, 当前关注点
- today_focus: text, optional, no default, 今日关注点
- health_score: integer, required, default 100, 健康评分
- ai_summary: text, optional, no default, AI 摘要
- ai_next_action: text, optional, no default, AI 下一步建议
- risk_summary: text, optional, no default, 风险摘要
- last_active_at: timestamp with time zone, optional, no default, 最近活跃时间
- closed_at: timestamp with time zone, optional, no default, 关闭时间
- archived_at: timestamp with time zone, optional, no default, 归档时间
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

## 3. Relation Tables

### matter_clients
- id: UUID, required, default generated, primary key
- matter_id: UUID, required, references matters(id)
- client_id: UUID, required, references clients(id)
- role: text, optional, no default, 客户角色
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### material_evidence
- id: UUID, required, default generated, primary key
- material_id: UUID, required, references materials(id)
- evidence_id: UUID, required, references evidence(id)
- relationship_type: text, optional, default 'supports', 关联类型
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### document_evidence
- id: UUID, required, default generated, primary key
- document_id: UUID, required, references documents(id)
- evidence_id: UUID, required, references evidence(id)
- relationship_type: text, optional, default 'references', 关联类型
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### document_research
- id: UUID, required, default generated, primary key
- document_id: UUID, required, references documents(id)
- research_id: UUID, required, references research(id)
- relationship_type: text, optional, default 'informed_by', 关联类型
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### timeline_documents
- id: UUID, required, default generated, primary key
- timeline_id: UUID, required, references timelines(id)
- document_id: UUID, required, references documents(id)
- relationship_type: text, optional, default 'related', 关联类型
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### timeline_evidence
- id: UUID, required, default generated, primary key
- timeline_id: UUID, required, references timelines(id)
- evidence_id: UUID, required, references evidence(id)
- relationship_type: text, optional, default 'related', 关联类型
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

### timeline_tasks
- id: UUID, required, default generated, primary key
- timeline_id: UUID, required, references timelines(id)
- task_id: UUID, required, references tasks(id)
- relationship_type: text, optional, default 'scheduled', 关联类型
- created_at: timestamp with time zone, required, default now(), 创建时间
- updated_at: timestamp with time zone, required, default now(), 最近更新时间

## 4. Enum Values

### matter.status
- consultation
- accepted
- active
- litigation
- progressing
- closing
- closed
- archived
- paused

### matter.source
- manual
- consultation
- import
- api
- ai

### matter.stage
- intake
- preparation
- evidence_collection
- drafting
- litigation_preparation
- trial
- post_trial
- review
- knowledge_capture

### matter.priority / matter.risk_level
- high
- medium
- low

### client.client_type
- person
- organization
- other

### material.material_category
- audio
- video
- image
- pdf
- word
- wechat_chat
- email
- contract
- identity
- bank_statement
- court_material
- other

### material.status
- pending
- processing
- waiting_review
- confirmed
- linked_evidence
- linked_document
- archived
- void

### evidence.evidence_category
- document
- physical
- witness
- statement
- electronic
- audio_video
- expert_opinion
- inspection
- other

### evidence.status
- candidate
- waiting_review
- confirmed
- submitted
- cross_examined
- accepted
- rejected
- archived

### evidence.strength
- weak
- medium
- strong

### document.document_category
- complaint
- answer
- representation_statement
- trial_outline
- evidence_list
- preservation_application
- enforcement_application
- lawyer_letter
- mediation_plan
- other

### document.status
- draft
- generating
- waiting_review
- lawyer_editing
- confirmed
- used
- archived
- void

### timeline.timeline_category
- consultation
- acceptance
- matter_start
- filing
- case_acceptance
- trial
- judgment
- enforcement
- payment
- closure
- other

### timeline.status
- pending
- confirmed
- completed
- archived
- cancelled

### timeline.source
- manual
- workflow
- ai
- court

### task.task_category
- communication
- material
- evidence
- research
- analysis
- document
- trial_preparation
- trial
- enforcement
- closure
- other

### task.status
- todo
- in_progress
- waiting_review
- completed
- archived
- cancelled

### task.priority
- low
- medium
- high
- urgent

### task.generated_by
- manual
- workflow
- ai
- court

### research.research_category
- legal_issue
- statute
- judicial_interpretation
- case_rule
- similar_case
- procedure
- enforcement
- other

### research.status
- researching
- waiting_review
- confirmed
- referenced
- archived
- void

### knowledge.knowledge_category
- practice
- case_rule
- risk_tip
- skill
- document_pattern
- trial_experience
- enforcement_experience
- prompt
- other

### knowledge.status
- waiting_review
- confirmed
- archived
- void

### ai_work_records.status
- processing
- completed
- confirmed
- archived
- failed

### matter_workspaces.status
- initializing
- active
- closing
- closed
- archived

## 5. Notes

- 本文档仅为 V1 最小可运行 Schema 设计，不生成 SQL。
- `matters` 不包含 `workspace_id`，避免与 `matter_workspaces` 循环引用。
- `matter_workspaces` 仅通过 `matter_id` 关联 `matters`。
- `ai_work_records` 不是聊天记录，不以 `prompt`/`response` 为核心字段。
- `matters.source` 仅记录 Matter 创建来源，不改变 Matter 状态。
- V1 不引入多租户、团队权限、复杂版本管理、向量数据库。
- 复杂业务约束、索引、关联唯一性、级联规则留到 `02_table_relation.md` 和后续版本。
- These fields are reserved to support future AI Runtime, Today Dashboard, and User System, without changing the V1 Domain Model.
