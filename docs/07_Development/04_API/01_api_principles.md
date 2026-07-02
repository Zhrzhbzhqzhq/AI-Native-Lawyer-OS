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

API 是业务对象的访问接口。

不是数据库接口。

不是 AI 接口。

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

- Matter
- Client
- Material
- Evidence
- Document
- Timeline
- Task
- Research
- Knowledge
- Matter_Workspace
- AI_Work_Record

禁止直接暴露数据库。

---

## 4. URI Principles

统一：

/api/v1/

资源：

/matters
/materials
/evidence
/documents
/tasks
/research
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

所有业务操作：

最终落到 Workflow。

API：

改变 Workflow。

Workflow：

驱动业务。

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

## 13. Freeze Conclusion

说明：

该文档定义 LawDesk V1 REST API 的总体原则。

Database、Frontend、AI Runtime 必须遵守。
