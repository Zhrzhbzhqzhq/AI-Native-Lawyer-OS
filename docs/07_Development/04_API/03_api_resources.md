---
Status: Frozen
Specification Version: V1.0
Document Version: 1.0.0
Module: API Resources
Owner: LawDesk Architecture
Last Updated: 2026-07-01
Architecture: LawDesk V1
Change Policy:
- Only documentation typo fixes are allowed.
- Any business rule, API, Workflow, Domain Model or Schema changes must target V2.
---

# 03_api_resources

## 1. Resource Principles

说明：

- 每个 Domain Model 对应一个 API Resource。
- API Resource 不等于数据库表。
- API 不直接暴露数据库实现。
- API 负责业务约束校验。
- Workflow 驱动状态变化。

## 2. Resource List

列出 V1 Resource：

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

## 3. Standard Resource Operations

统一基础操作：

GET /api/v1/{resource}

GET /api/v1/{resource}/{id}

POST /api/v1/{resource}

PATCH /api/v1/{resource}/{id}

DELETE /api/v1/{resource}/{id}

说明：

DELETE 默认 Archive。

## 4. Matter Resource

说明：

Matter 是核心资源。

基础接口：

GET /api/v1/matters

GET /api/v1/matters/{id}

POST /api/v1/matters

PATCH /api/v1/matters/{id}

DELETE /api/v1/matters/{id}

特殊接口：

GET /api/v1/matters/{id}/workspace

GET /api/v1/matters/{id}/tasks

GET /api/v1/matters/{id}/timeline

GET /api/v1/matters/{id}/documents

GET /api/v1/matters/{id}/evidence

GET /api/v1/matters/{id}/materials

## 5. Client Resource

基础接口：

GET /api/v1/clients

GET /api/v1/clients/{id}

POST /api/v1/clients

PATCH /api/v1/clients/{id}

DELETE /api/v1/clients/{id}

关系接口：

GET /api/v1/matters/{id}/clients

POST /api/v1/matters/{id}/clients

DELETE /api/v1/matters/{id}/clients/{client_id}

## 6. Material Resource

基础接口：

GET /api/v1/materials

GET /api/v1/materials/{id}

POST /api/v1/materials

PATCH /api/v1/materials/{id}

DELETE /api/v1/materials/{id}

特殊接口：

POST /api/v1/materials/{id}/mark-candidate-evidence

POST /api/v1/materials/{id}/confirm

## 7. Evidence Resource

基础接口：

GET /api/v1/evidence

GET /api/v1/evidence/{id}

POST /api/v1/evidence

PATCH /api/v1/evidence/{id}

DELETE /api/v1/evidence/{id}

特殊接口：

POST /api/v1/evidence/{id}/confirm

POST /api/v1/evidence/{id}/reject

## 8. Document Resource

基础接口：

GET /api/v1/documents

GET /api/v1/documents/{id}

POST /api/v1/documents

PATCH /api/v1/documents/{id}

DELETE /api/v1/documents/{id}

特殊接口：

POST /api/v1/documents/{id}/confirm

POST /api/v1/documents/{id}/archive

## 9. Timeline Resource

基础接口：

GET /api/v1/timelines

GET /api/v1/timelines/{id}

POST /api/v1/timelines

PATCH /api/v1/timelines/{id}

DELETE /api/v1/timelines/{id}

## 10. Task Resource

基础接口：

GET /api/v1/tasks

GET /api/v1/tasks/{id}

POST /api/v1/tasks

PATCH /api/v1/tasks/{id}

DELETE /api/v1/tasks/{id}

特殊接口：

POST /api/v1/tasks/{id}/complete

POST /api/v1/tasks/{id}/cancel

## 11. Research Resource

基础接口：

GET /api/v1/research

GET /api/v1/research/{id}

POST /api/v1/research

PATCH /api/v1/research/{id}

DELETE /api/v1/research/{id}

特殊接口：

POST /api/v1/research/{id}/confirm

POST /api/v1/research/{id}/reference

## 12. Knowledge Resource

基础接口：

GET /api/v1/knowledge

GET /api/v1/knowledge/{id}

POST /api/v1/knowledge

PATCH /api/v1/knowledge/{id}

DELETE /api/v1/knowledge/{id}

特殊接口：

POST /api/v1/knowledge/{id}/confirm

## 13. AI Work Record Resource

基础接口：

GET /api/v1/ai-work-records

GET /api/v1/ai-work-records/{id}

POST /api/v1/ai-work-records

PATCH /api/v1/ai-work-records/{id}

特殊接口：

POST /api/v1/ai-work-records/{id}/confirm

说明：

AI Work Record 不是聊天记录。

## 14. Workspace Resource

基础接口：

GET /api/v1/workspaces

GET /api/v1/workspaces/{id}

PATCH /api/v1/workspaces/{id}

特殊接口：

GET /api/v1/workspaces/{id}/overview

GET /api/v1/workspaces/{id}/today

GET /api/v1/workspaces/{id}/ai-summary

## 15. Resource Ownership Rules

说明：

除 Knowledge 外，业务资源创建时必须提供 matter_id。

Matter_Workspace 必须关联 Matter。

AI Work Record 必须关联 Matter。

## 16. V2 Reserved

V2 再考虑：

- Batch Resource API
- Bulk Update
- Export API
- Import API
- Webhook Resource
- Public API Resource
- SDK Resource

## 17. Freeze Conclusion

说明：

该 Resource 设计可支撑 V1 REST API、Frontend 和 AI Runtime。