---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: API Principles
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 01_api_principles

## 1. API Principles

说明：

- REST First
- JSON Only
- Resource Oriented
- Stateless
- Predictable
- Documentation First

API Executes.

API does not define business rules.

API does not define Workflow.

API does not define Domain Model.

API does not define Database Schema.

API does not change Workflow by itself.

Workflow defines state transition.

Validation defines whether execution is allowed.

API only executes approved operations.

Database is Source of Truth.

---

## 2. API Design Goals

LawDesk API 应满足：

- 简单
- 一致
- 可扩展
- 易测试
- 易维护

减少律师认知负担。

保持资源模型稳定。

---

## 3. Resource Principles

每个 Domain Model 对应一个 Resource。

例如：

- matters
- clients
- materials
- evidence
- documents
- tasks
- timelines
- workflow-events
- ai-records
- knowledge
- workspaces

禁止直接暴露数据库。

API Resource is the execution boundary for a Domain Model.

---

## 4. URI Principles

统一：

/api/v1/

资源：

/matters
/clients
/materials
/evidence
/documents
/tasks
/timelines
/workflow-events
/ai-records
/knowledge
/workspaces

统一使用复数。

禁止：

/getMatter
/createTask
/deleteEvidence

---

## 5. HTTP Method Principles

GET

读取

POST

创建

PATCH

部分更新

DELETE

Archive（V1 默认归档）

说明：

V1 默认不用 PUT。

DELETE 不直接物理删除。

---

## 6. Response Principles

统一 JSON。

成功：

- success
- data
- meta

失败：

- success
- error
- code
- message
- details

统一响应格式。

---

## 7. Versioning

统一：

/api/v1/

未来：

/api/v2/

禁止：

URI 不带版本。

---

## 8. Authentication

V1：

暂不设计。

预留：

- JWT
- OAuth
- API Key

---

## 9. AI Principles

AI 不直接修改数据库。

AI：

生成建议。

API：

完成写入。

律师：

最终确认。

---

## 10. Workflow Principles

Domain Model

↓

API Resource

↓

Workflow Validation

↓

API Executes

↓

Database Updates

↓

Workflow Event

↓

Runtime Refresh

说明：

- Business Rule belongs to Workflow / Domain Model.
- Validation belongs to Workflow Validation.
- Persistence belongs to Database.
- Runtime view belongs to Runtime.
- API is execution boundary only.

---

## 11. Naming Principles

API 字段：

保持 snake_case。

与数据库保持一致。

不做 camelCase 转换。

---

## 12. V2 Reserved

以后：

- GraphQL
- WebSocket
- Streaming
- Webhook
- Batch API
- Public API
- SDK

均属于 V2。

---

## Freeze Rules

This specification is frozen for LawDesk V1.

Future evolution belongs to V2.

---

## 13. Freeze Conclusion

说明：

该文档定义 LawDesk V1 API Principles 官方规范。

API Executes.

API does not define business rules.

API does not define Workflow.

API does not define Domain Model.

API does not define Database Schema.

Workflow defines state transition.

Validation defines whether execution is allowed.

Database、Frontend、AI Runtime 必须遵守。

Database is Source of Truth.

本规范自 V1 起正式冻结。
