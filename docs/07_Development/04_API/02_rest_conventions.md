---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: REST Conventions
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 02_rest_conventions

## 1. REST Convention Principles

说明：

- API 统一使用 `/api/v1`
- 资源使用复数名词
- 使用标准 HTTP 方法
- 请求和响应均为 JSON
- 字段统一 snake_case
- DELETE 默认执行 Archive，不做物理删除

---

## 2. Base Path

统一：

/api/v1

示例：

/api/v1/matters

/api/v1/tasks

/api/v1/documents

---

## 3. Resource Identifier

说明：

- 所有 Resource ID 统一使用 UUID。
- API 永远使用 UUID 定位资源。
- 不使用业务编号作为 URI。

示例：

GET /api/v1/matters/{id}

PATCH /api/v1/tasks/{id}

DELETE /api/v1/documents/{id}

禁止：

/api/v1/matters/20260001

/api/v1/matters/matter_no

说明：

业务编号（matter_no、document_no 等）属于业务字段，而不是资源定位方式。

---

## 4. Resource Naming

资源命名：

- matters
- clients
- materials
- evidence
- documents
- timelines
- tasks
- research
- knowledge
- ai-work-records
- workspaces

说明：

- API Resource 使用 kebab-case 或复数名词。
- 字段仍使用 snake_case。
- 不使用 get/create/update/delete 动词作为 URI。

禁止：

/getMatter

/createTask

/updateDocument

---

## 5. HTTP Methods

GET：

读取资源。

POST：

创建资源。

PATCH：

部分更新资源。

DELETE：

默认 Archive。

禁止：

PUT

除非 V2 明确引入。

---

## 6. PATCH Convention

说明：

PATCH：

仅更新请求中提供的字段。

未提供字段：

保持原值。

禁止：

PATCH 自动覆盖整个对象。

LawDesk V1 默认不使用 PUT。

---

## 7. Idempotency

说明：

GET：

必须幂等。

多次调用：

返回相同资源状态。

PATCH：

相同请求重复执行，不应产生额外副作用。

DELETE：

重复执行 Archive，应返回一致结果。

POST：

默认不保证幂等。

说明：

API 应避免因重复请求产生重复业务对象。

---

## 8. Request Body

请求体：

JSON only。

字段：

snake_case。

示例：

{
  "title": "张三诉李四民间借贷纠纷",
  "matter_category": "civil",
  "priority": "medium"
}

---

## 9. Response Format

成功响应：

{
  "success": true,
  "data": {},
  "meta": {}
}

失败响应：

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request.",
    "details": {}
  }
}

---

## 10. HTTP Status Convention

统一使用标准 HTTP Status：

200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Unprocessable Entity

500 Internal Server Error

说明：

HTTP Status 与 Error Code 必须保持一致。

例如：

404

对应：

NOT_FOUND

409

对应：

CONFLICT

---

## 11. List Response

列表响应：

{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 100
  }
}

---

## 12. Meta Convention

meta 用于返回：

- page
- page_size
- total
- request_id
- timestamp

说明：

meta 仅用于响应元数据。

业务对象始终位于：

data

禁止：

将业务数据放入 meta。

---

## 13. Pagination

默认：

page=1

page_size=20

最大：

page_size=100

示例：

GET /api/v1/matters?page=1&page_size=20

---

## 14. Sorting

统一使用：

sort

示例：

GET /api/v1/tasks?sort=due_at

倒序：

GET /api/v1/tasks?sort=-due_at

---

## 15. Filtering

过滤使用 query string。

示例：

GET /api/v1/tasks?status=todo

GET /api/v1/matters?risk_level=high

GET /api/v1/materials?matter_id=xxx

---

## 16. Status Transition

说明：

业务状态必须遵循 Workflow。

API 不允许跳过关键状态。

例如：

consultation

↓

accepted

↓

active

↓

closed

↓

archived

非法状态转换：

返回

BUSINESS_RULE_VIOLATION

说明：

真正的状态机规则由 Workflow 定义。

API 负责执行和校验。

---

## 17. Archive Convention

DELETE 不物理删除。

DELETE 表示：

归档

或

状态变更为 archived。

示例：

DELETE /api/v1/matters/{id}

等价于：

PATCH /api/v1/matters/{id}

{
  "status": "archived"
}

---

## 18. Confirmation Convention

正式业务动作必须律师确认。

例如：

confirm evidence

confirm document

confirm research

统一使用：

POST /api/v1/evidence/{id}/confirm

POST /api/v1/documents/{id}/confirm

POST /api/v1/research/{id}/confirm

---

## 19. DateTime Convention

说明：

所有时间统一：

ISO 8601

数据库统一保存 UTC。

客户端根据用户时区显示。

示例：

2026-07-01T08:30:00Z

禁止：

本地字符串时间。

---

## 20. AI Result Convention

AI 结果不直接写正式对象。

AI 结果先进入：

ai_work_records

律师确认后：

由 API 写入正式对象。

AI 不允许直接修改数据库。

AI 必须通过 API 完成业务对象更新。

API 是唯一允许写入业务数据的入口。

Database 永远是真实业务数据来源（Source of Truth）。

---

## 21. Resource Ownership

说明：

LawDesk 所有业务对象最终归属于 Matter。

API 不允许创建脱离 Matter 的业务对象。

例如：

Material

Evidence

Document

Timeline

Task

Research

AI_Work_Record

Matter_Workspace

均必须拥有：

matter_id

Knowledge 可作为唯一例外。

Knowledge：

既可以关联 Matter，

也可以独立存在。

---

## 22. Error Code Convention

错误码使用大写 snake_case。

示例：

VALIDATION_ERROR

NOT_FOUND

UNAUTHORIZED

FORBIDDEN

CONFLICT

BUSINESS_RULE_VIOLATION

AI_RESULT_NOT_CONFIRMED

---

## 23. V2 Reserved

V2 再考虑：

- Batch API
- Streaming
- WebSocket
- Webhook
- GraphQL
- Public API

---

## 24. Freeze Conclusion

说明：

该 REST Convention 支持 V1 API、Frontend、AI Runtime 开发。
