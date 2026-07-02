---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: Matter API
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 04_matter_api

## 1. Purpose

Matter 是 LawDesk 的核心业务对象。

所有业务最终围绕 Matter 展开。

Matter API 是整个系统最重要的 Resource API。

## 2. Resource URI

Base：

/api/v1/matters

Single：

/api/v1/matters/{id}

## 3. Supported Operations

支持：

GET

POST

PATCH

DELETE（Archive）

POST Action

包括：

- start
- close
- archive

## 4. List Matters

GET

/api/v1/matters

支持：

分页

排序

过滤

Query Parameters：

- page
- page_size
- status
- stage
- priority
- risk_level
- practice_area
- matter_category
- sort

默认排序：

updated_at desc

示例过滤：

status

stage

priority

risk_level

practice_area

matter_category

说明：

返回 Matter 列表。

## 5. Get Matter

GET

/api/v1/matters/{id}

返回：

Matter 完整信息。

## 6. Create Matter

POST

/api/v1/matters

必须字段：

title

primary_client_id：可选。

Request Body 示例：

{
  "title": "张三诉李四民间借贷纠纷",
  "matter_category": "civil",
  "practice_area": "civil_litigation",
  "priority": "medium",
  "risk_level": "medium",
  "primary_client_id": "uuid",
  "court": "石家庄市中级人民法院",
  "source": "manual"
}

Response 示例：

{
  "success": true,
  "data": {
    "id": "uuid",
    "matter_no": "M20260001",
    "title": "张三诉李四民间借贷纠纷",
    "status": "consultation",
    "stage": "intake",
    "source": "manual",
    "created_at": "2026-07-01T08:30:00Z",
    "updated_at": "2026-07-01T08:30:00Z"
  },
  "meta": {
    "request_id": "...",
    "timestamp": "2026-07-01T08:30:00Z"
  }
}

说明：

创建 Matter 后：

自动生成：

matter_no。

自动创建：

Matter Workspace。

创建后应生成初始 Timeline 事件。

创建后可生成初始 Task：完成客户信息确认。

Matter 初始状态：

consultation

Matter 初始阶段：

intake

source 用于表示 Matter 创建来源。

可选值：

- manual
- consultation
- import
- api
- ai

说明：

source 不改变 Matter 状态，只用于记录创建来源。

LawDesk 支持先创建 Matter，再补录客户信息。

当 Matter 从：

consultation

进入：

accepted

或

active

时，

必须至少关联一个 Client。

否则返回：

PRIMARY_CLIENT_REQUIRED

说明：

该规则由 Workflow 校验。

API 执行。

## 7. Start Matter

POST

/api/v1/matters/{id}/start

说明：

用于将 Matter 从咨询/接案阶段推进到正式办理阶段。

该操作必须经过 Workflow 校验。

可能更新：

- status
- stage
- started_at
- current_focus
- next_action

说明：

- accepted_at 在 Matter 首次进入 accepted 状态时自动写入。
- accepted_at 仅首次写入，写入后不得修改。
- accepted_at 用于记录正式接案时间。
- started_at 表示正式进入办理阶段，两者语义不同。

执行后可触发：

- 初始化 Workspace
- 初始化 Today
- 创建首批 Task
- 创建 Timeline 事件

禁止：

AI 直接启动 Matter。

## 8. Update Matter

PATCH

/api/v1/matters/{id}

允许更新：

summary

status

stage

priority

risk_level

court

judge

next_deadline

current_focus

next_action

lawyer_note

说明：

PATCH 不覆盖未提交字段。

禁止直接修改：

- matter_no
- created_at
- updated_at

status / stage 修改必须经过 Workflow 校验。

## 9. Close Matter

POST

/api/v1/matters/{id}/close

说明：

用于结案。

该操作必须由律师确认。

可能更新：

- status = closing 或 closed
- closed_at
- current_focus
- next_action

结案后可触发：

- 结案归档
- 案件复盘
- 知识沉淀

## 10. Archive Matter

DELETE

/api/v1/matters/{id}

说明：

默认 Archive。

不得物理删除。

Archive 前必须检查未完成 Task。

Archive 后：

matter.status = archived

matter_workspace.status = archived

未完成 tasks.status = archived

AI 不允许自动 Archive Matter。

Archive 后：

Workspace

Task

Today

进入 Archive 状态。

POST

/api/v1/matters/{id}/archive

说明：

该 Action 与 DELETE Archive 语义一致。

用于 Workflow、Today、AI Runtime 显式触发 Archive 行为。

Archive 不物理删除 Matter。

## 11. Matter Overview

GET

/api/v1/matters/{id}/overview

说明：

用于案件工作区首页。

返回聚合摘要：

- Matter
- Matter_Workspace
- Today Focus
- Health Score
- AI Summary
- Next Action
- Risk Summary
- Recent Tasks
- Recent Timeline

说明：

Overview 是聚合读取接口。

不用于写入业务数据。

## 12. Matter Dashboard

GET

/api/v1/matters/{id}/dashboard

说明：

用于 Matter 工作驾驶舱。

返回聚合信息：

- Matter Summary
- Workspace Status
- Current Stage
- Today Focus
- Next Deadline
- AI Working Status
- Pending AI Suggestions
- Health Score
- Risk Summary
- Recent Tasks
- Recent Timeline
- Recent AI Work Records

说明：

Current Stage 用于展示案件当前所处 Workflow 阶段。

Next Deadline 用于展示当前案件最近的关键期限。

Dashboard 为聚合读取接口，不写入业务对象。

Overview：

偏业务数据。

Dashboard：

偏 AI Runtime 与工作状态。

## 13. Related Resources

支持：

GET

/api/v1/matters/{id}/workspace

GET

/api/v1/matters/{id}/clients

GET

/api/v1/matters/{id}/materials

GET

/api/v1/matters/{id}/evidence

GET

/api/v1/matters/{id}/documents

GET

/api/v1/matters/{id}/timeline

GET

/api/v1/matters/{id}/tasks

GET

/api/v1/matters/{id}/research

GET

/api/v1/matters/{id}/knowledge

GET

/api/v1/matters/{id}/ai-work-records

## 14. Workflow Rules

Matter 状态必须遵循：

Workflow。

禁止：

跳阶段。

非法：

返回：

BUSINESS_RULE_VIOLATION。

## 15. AI Rules

AI：

允许：

建议：

summary

next_action

risk_tip

禁止：

直接修改 Matter。

必须：

通过 API。

## 16. Business Constraints

Matter：

必须唯一：

matter_no。

必须：

拥有 Workspace。

必须：

至少关联一个 Client。

Archive：

不得自动删除：

Materials

Evidence

Documents

Research

Knowledge

## 17. Response Fields

说明 Matter 返回字段至少包括：

- id
- matter_no
- title
- summary
- matter_category
- practice_area
- cause_of_action
- status
- stage
- priority
- risk_level
- primary_client_id
- court
- case_number
- judge
- next_deadline
- current_focus
- next_action
- source
- accepted_at
- started_at
- closed_at
- archived_at
- ai_summary
- ai_next_action
- ai_risk_tip
- created_at
- updated_at

## 18. Example Response

使用统一响应格式：

{
  "success": true,
  "data": {
    ...
  },
  "meta": {
    "request_id": "...",
    "timestamp": "..."
  }
}

说明：

"data" 应包含本节 Response Fields 中定义的 Matter 字段；其中 accepted_at、started_at、closed_at、archived_at 等生命周期字段，根据 Matter 当前状态可能为空（null）或已有值。

## 19. Error Behavior

- MATTER_NOT_FOUND → 404
- PRIMARY_CLIENT_REQUIRED → 422
- INVALID_STAGE_TRANSITION → 409
- MATTER_START_NOT_ALLOWED → 422
- MATTER_NOT_STARTED → 409
- MATTER_ALREADY_CLOSED → 409
- MATTER_ALREADY_ARCHIVED → 409
- MATTER_CANNOT_ARCHIVE → 422
- WORKSPACE_NOT_FOUND → 404
- BUSINESS_RULE_VIOLATION → 422

## 20. Error Codes

- MATTER_NOT_FOUND
- PRIMARY_CLIENT_REQUIRED
- INVALID_STAGE_TRANSITION
- MATTER_START_NOT_ALLOWED
- MATTER_NOT_STARTED
- MATTER_ALREADY_CLOSED
- MATTER_ALREADY_ARCHIVED
- MATTER_CANNOT_ARCHIVE
- WORKSPACE_NOT_FOUND
- BUSINESS_RULE_VIOLATION

## 21. V2 Reserved

以后：

Merge Matter

Split Matter

Duplicate Matter

Restore Matter

## 22. Freeze Conclusion

该文档定义 LawDesk V1 Matter API。

Matter API 是整个系统 API 的基础。

该 Matter API 已支持：

- Matter CRUD
- Matter Lifecycle
- Workflow Entry
- Overview
- Dashboard
- Workspace Entry
- Today Runtime
- AI Runtime Entry
